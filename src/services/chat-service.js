const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');
const { Message } = require('../models/Message');
const { body, validationResult } = require('express-validator');
const rediLuaService = require('./redis-lua-service');
const { redisClient } = require('../redis');

const PUBKEY_TTL = 30 * 24 * 60 * 60;
const pubkeyCacheKey = (userId) => `e2ee:pubkey:${userId}`;

async function cachePublicKey(userId, payload) {
  try {
    if (redisClient?.isOpen) {
      await redisClient.setEx(pubkeyCacheKey(userId), PUBKEY_TTL, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('Redis pubkey cache write failed (non-critical):', err.message);
  }
}

async function invalidatePublicKey(userId) {
  try {
    if (redisClient?.isOpen) {
      await redisClient.del(pubkeyCacheKey(userId));
    }
  } catch (err) {
    console.warn('Redis pubkey cache delete failed (non-critical):', err.message);
  }
}

let io;
const userSockets = new Map();

const setSocketIO = (socketIOInstance) => {
  io = socketIOInstance;
};

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};


async function rateLimitByUser(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required for rate limiting' });
    }
    const key = `rate_limit:user:${userId}`;
    const result = await rediLuaService.checkRateLimit(key, 60, 75); // 75 requests per 60 seconds
    if (!result.allowed) {
      return res.status(429).sendFile(path.join(__dirname, '../../public/429/429.html'));
    }

    res.set({
      'X-RateLimit-Limit': '75',
      'X-RateLimit-Remaining': Math.max(0, 74 - result.currentCount),
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 60
    });
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
  
}

router.use('/', rateLimitByUser);

router.post('/setup-e2ee', 
  requireAuth,
  [
    body('publicKey').notEmpty().withMessage('Public key is required'),
    body('keyAlgorithm').optional().isIn(['RSA-OAEP', 'RSA-PSS']).withMessage('Invalid key algorithm')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { publicKey, keyAlgorithm = 'RSA-OAEP' } = req.body;
      const userId = req.session.user.id;
      const keyGeneratedAt = new Date();

      // Update user with encryption details
      await User.findByIdAndUpdate(userId, {
        'encryption.publicKey': publicKey,
        'encryption.keyGeneratedAt': keyGeneratedAt,
        'encryption.isE2EEEnabled': true,
        'encryption.keyAlgorithm': keyAlgorithm
      });

      // Cache new public key in Redis (30-day TTL); old entry is overwritten
      await cachePublicKey(userId, {
        userId,
        publicKey,
        keyAlgorithm,
        keyGeneratedAt
      });

      res.json({ 
        success: true, 
        message: 'E2EE setup completed successfully' 
      });
    } catch (error) {
      console.error('E2EE setup error:', error);
      res.status(500).json({ error: 'Failed to setup E2EE' });
    }
  }
);

router.get('/public-key/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Try Redis cache first
    if (redisClient?.isOpen) {
      try {
        const cached = await redisClient.get(pubkeyCacheKey(userId));
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (err) {
        console.warn('Redis pubkey cache read failed (non-critical):', err.message);
      }
    }

    const user = await User.findById(userId, 'encryption username').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.encryption.isE2EEEnabled || !user.encryption.publicKey) {
      return res.status(400).json({ error: 'User does not have E2EE enabled' });
    }

    const payload = {
      userId: user._id,
      username: user.username,
      publicKey: user.encryption.publicKey,
      keyAlgorithm: user.encryption.keyAlgorithm,
      keyGeneratedAt: user.encryption.keyGeneratedAt
    };

    // Populate cache for subsequent requests
    await cachePublicKey(userId, payload);

    res.json(payload);
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ error: 'Failed to retrieve public key' });
  }
});

router.post('/send-message',
  requireAuth,
  [
    body('recipientId').isMongoId().withMessage('Valid recipient ID is required'),
    body('encryptedContent').notEmpty().withMessage('Encrypted content is required'),
    body('encryptionMetadata.senderEncryptedKey').notEmpty().withMessage('Sender encrypted key is required'),
    body('encryptionMetadata.recipientEncryptedKey').notEmpty().withMessage('Recipient encrypted key is required'),
    body('encryptionMetadata.iv').notEmpty().withMessage('Initialization vector is required'),
    body('messageType').optional().isIn(['text', 'file', 'image']).withMessage('Invalid message type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { recipientId, encryptedContent, encryptionMetadata, messageType = 'text' } = req.body;
      const senderId = req.session.user.id;

      const [sender, recipient] = await Promise.all([
        User.findById(senderId, 'encryption').lean(),
        User.findById(recipientId, 'encryption').lean()
      ]);

      if (!sender?.encryption.isE2EEEnabled || !recipient?.encryption.isE2EEEnabled) {
        return res.status(400).json({ error: 'Both users must have E2EE enabled' });
      }

      // Create encrypted message
      const message = new Message({
        senderId,
        recipientId,
        encryptedContent,
        encryptionMetadata,
        messageType
      });

      await message.save();

      if (io) {
        io.to(`user_${recipientId}`).emit('newMessage', {
          messageId: message._id,
          senderId,
          recipientId,
          encryptedContent,
          encryptionMetadata,
          messageType,
          timestamp: message.createdAt
        });
      }

      res.json({
        success: true,
        messageId: message._id,
        timestamp: message.createdAt
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// Get messages for a conversation
router.get('/messages/:otherUserId', requireAuth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get messages between two users, excluding ones that were auto-replaced
    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId }
      ],
      status: { $ne: 'replaced' }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('senderId', 'username')
    .populate('recipientId', 'username')
    .lean();

    // Mark messages as delivered if user is recipient
    await Message.updateMany(
      { senderId: otherUserId, recipientId: userId, status: 'sent' },
      { status: 'delivered' }
    );

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

// Fetch a single message — used by the sender during auto-resend to recover plaintext
router.get('/message/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.session.user.id;
    const message = await Message.findById(messageId).lean();
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (String(message.senderId) !== userId && String(message.recipientId) !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json(message);
  } catch (error) {
    console.error('Fetch single message error:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Mark a message as replaced after a successful auto-resend
router.post('/message/:messageId/replace', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { recipientId } = req.body;
    const userId = req.session.user.id;
    const message = await Message.findById(messageId).lean();
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (String(message.senderId) !== userId) {
      return res.status(403).json({ error: 'Only the sender can mark a message as replaced' });
    }
    await Message.findByIdAndUpdate(messageId, { status: 'replaced' });
    if (io) {
      io.to(`user_${userId}`).emit('messageReplaced', { messageId });
      io.to(`user_${recipientId}`).emit('messageReplaced', { messageId });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Mark replaced error:', error);
    res.status(500).json({ error: 'Failed to mark message as replaced' });
  }
});

// Mark messages as read
router.put('/messages/read/:otherUserId', requireAuth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.session.user.id;

    await Message.updateMany(
      { 
        senderId: otherUserId, 
        recipientId: userId, 
        status: { $in: ['sent', 'delivered'] }
      },
      { 
        status: 'read',
        readAt: new Date()
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get conversation list
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get unique conversations by aggregating messages
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { recipientId: userId }
          ],
          status: { $ne: 'replaced' }  // exclude auto-replaced messages from sidebar preview
        }
      },
      {
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ['$senderId', userId] },
              then: '$recipientId',
              else: '$senderId'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipientId', userId] },
                    { $in: ['$status', ['sent', 'delivered']] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          unreadCount: 1,
          username: { $arrayElemAt: ['$userInfo.username', 0] },
          isE2EEEnabled: { $arrayElemAt: ['$userInfo.encryption.isE2EEEnabled', 0] }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

async function searchUsers(query, userId, excludeAdmins = false) {
  const filter = {
    _id: { $ne: userId },
    'encryption.isE2EEEnabled': true,
    username: { $regex: query, $options: 'i' }
  };
  if (excludeAdmins) {
    filter.usertype = { $ne: 'admin' };
  }
  return User.find(filter, 'username encryption.isE2EEEnabled').limit(20).lean();
}

router.get('/search-users', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.session.user.id;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }
    const currentUser = await User.findById(userId).lean();
    const excludeAdmins = ['student', 'teacher', 'parent'].includes(currentUser.usertype);

    const users = await searchUsers(query, userId, excludeAdmins);
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.get('/e2ee-status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId, 'encryption').lean();
    
    res.json({
      isEnabled: user?.encryption?.isE2EEEnabled || false,
      hasPublicKey: !!user?.encryption?.publicKey,
      keyGeneratedAt: user?.encryption?.keyGeneratedAt,
      keyAlgorithm: user?.encryption?.keyAlgorithm
    });
  } catch (error) {
    console.error('Get E2EE status error:', error);
    res.status(500).json({ error: 'Failed to get E2EE status' });
  }
});

router.post('/reset-e2ee', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    await User.findByIdAndUpdate(userId, {
      'encryption.publicKey': null,
      'encryption.keyGeneratedAt': null,
      'encryption.isE2EEEnabled': false,
      'encryption.encryptedPrivateKey': null,
      'encryption.keySalt': null,
      'encryption.keyIv': null,
      'encryption.hasKeyBackup': false
    });

    // Remove stale cached key so the next sender doesn't encrypt to a dead key
    await invalidatePublicKey(userId);
    
    res.json({ success: true, message: 'E2EE reset successfully' });
  } catch (error) {
    console.error('Reset E2EE error:', error);
    res.status(500).json({ error: 'Failed to reset E2EE' });
  }
});

// Backup encrypted private key to server
router.post('/backup-keys', requireAuth, async (req, res) => {
  try {
    const { encryptedPrivateKey, salt, iv } = req.body;
    const userId = req.session.user.id;

    if (!encryptedPrivateKey || !salt || !iv) {
      return res.status(400).json({ error: 'Missing backup data' });
    }

    await User.findByIdAndUpdate(userId, {
      'encryption.encryptedPrivateKey': encryptedPrivateKey,
      'encryption.keySalt': salt,
      'encryption.keyIv': iv,
      'encryption.hasKeyBackup': true
    });

    res.json({ success: true, message: 'Key backup stored successfully' });
  } catch (error) {
    console.error('Backup keys error:', error);
    res.status(500).json({ error: 'Failed to backup keys' });
  }
});

// Check if user has a key backup on the server
router.get('/has-key-backup', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId, 'encryption').lean();

    res.json({
      hasBackup: user?.encryption?.hasKeyBackup || false,
      hasPublicKey: !!user?.encryption?.publicKey,
      isE2EEEnabled: user?.encryption?.isE2EEEnabled || false
    });
  } catch (error) {
    console.error('Check backup error:', error);
    res.status(500).json({ error: 'Failed to check key backup' });
  }
});

// Restore encrypted private key from server
router.get('/restore-keys', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId, 'encryption').lean();

    if (!user?.encryption?.hasKeyBackup || !user?.encryption?.encryptedPrivateKey) {
      return res.status(404).json({ error: 'No key backup found' });
    }

    res.json({
      encryptedPrivateKey: user.encryption.encryptedPrivateKey,
      salt: user.encryption.keySalt,
      iv: user.encryption.keyIv,
      publicKey: user.encryption.publicKey
    });
  } catch (error) {
    console.error('Restore keys error:', error);
    res.status(500).json({ error: 'Failed to restore keys' });
  }
});

router.post('/admin/clear-all-e2ee', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).lean();
    
    if (!user || user.usertype !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { clearMessages = true } = req.body;
    
    console.log('Admin clearing all E2EE data...');
    
    const userUpdateResult = await User.updateMany(
      {},
      {
        $unset: {
          'encryption.publicKey': '',
          'encryption.keyGeneratedAt': ''
        },
        $set: {
          'encryption.isE2EEEnabled': false
        }
      }
    );
    
    console.log(`Cleared encryption settings for ${userUpdateResult.modifiedCount} users`);
    
    let messageDeleteResult = null;
    if (clearMessages) {
      messageDeleteResult = await Message.deleteMany({});
      console.log(`Deleted ${messageDeleteResult.deletedCount} encrypted messages`);
    }
    
    res.json({
      success: true,
      message: 'All E2EE data cleared successfully',
      usersCleared: userUpdateResult.modifiedCount,
      messagesDeleted: messageDeleteResult ? messageDeleteResult.deletedCount : 0
    });
  } catch (error) {
    console.error('Clear all E2EE error:', error);
    res.status(500).json({ error: 'Failed to clear E2EE data' });
  }
});

// Sender's new device marks messages as needing sender-key recovery (persisted in MongoDB)
router.post('/request-sender-recovery', requireAuth, async (req, res) => {
  try {
    const senderId = req.session.user.id;
    const { messageIds, recipientId } = req.body;
    if (!messageIds?.length || !recipientId) {
      return res.status(400).json({ error: 'messageIds and recipientId required' });
    }

    const sender = await User.findById(senderId, 'encryption').lean();
    if (!sender?.encryption?.publicKey) {
      return res.status(400).json({ error: 'Sender public key not found on server — re-setup E2EE first' });
    }

    const ids = messageIds.slice(0, 100);
    console.log(`[Recovery] Sender ${senderId} requesting recovery for ${ids.length} messages (recipient: ${recipientId})`);
    const result = await Message.updateMany(
      {
        _id: { $in: ids },
        senderId: senderId,
        recipientId: recipientId,
        status: { $ne: 'replaced' },
        'senderKeyRecovery.needed': { $ne: true }
      },
      {
        $set: {
          'senderKeyRecovery.needed': true,
          'senderKeyRecovery.senderPublicKey': sender.encryption.publicKey,
          'senderKeyRecovery.senderKeyId': sender.encryption.keyId || senderId
        }
      }
    );

    // Also nudge recipient via socket if they're online
    if (io) {
      const recipientSockets = userSockets.get(recipientId);
      const targetSocketId = recipientSockets && recipientSockets.size > 0
        ? [...recipientSockets].at(-1) : null;
      if (targetSocketId) {
        io.to(targetSocketId).emit('processPendingRecovery');
      } else {
        io.to(`user_${recipientId}`).emit('processPendingRecovery');
      }
    }

    console.log(`[Recovery] Marked ${result.modifiedCount} messages as needing recovery`);
    res.json({ success: true, queued: result.modifiedCount });
  } catch (error) {
    console.error('request-sender-recovery error:', error);
    res.status(500).json({ error: 'Failed to queue recovery requests' });
  }
});

// Recipient fetches messages needing sender-key recovery (from MongoDB, survives restarts)
router.get('/pending-recovery', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const messages = await Message.find(
      { recipientId: userId, 'senderKeyRecovery.needed': true },
      '_id senderId senderKeyRecovery'
    ).limit(100).lean();

    const requests = messages.map(m => ({
      messageId:       String(m._id),
      senderId:        String(m.senderId),
      senderPublicKey: m.senderKeyRecovery.senderPublicKey,
      senderKeyId:     m.senderKeyRecovery.senderKeyId
    }));

    console.log(`[Recovery] Recipient ${userId} has ${requests.length} pending recovery requests`);
    res.json({ requests });
  } catch (error) {
    console.error('pending-recovery error:', error);
    res.status(500).json({ error: 'Failed to fetch pending recovery' });
  }
});

// Recipient patches senderEncryptedKey so sender's new device can decrypt their own messages
router.post('/message/:messageId/update-sender-key', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newSenderEncryptedKey, requesterId } = req.body;
    const userId = req.session.user.id;

    if (!newSenderEncryptedKey) {
      return res.status(400).json({ error: 'Missing newSenderEncryptedKey' });
    }
    const message = await Message.findById(messageId).lean();
    if (!message) return res.status(404).json({ error: 'Message not found' });
    // Only the recipient of a message may update its sender key
    if (String(message.recipientId) !== userId) {
      return res.status(403).json({ error: 'Only the recipient can update the sender key' });
    }

    console.log(`[Recovery] Recipient ${userId} updating senderEncryptedKey for message ${messageId}`);
    await Message.findByIdAndUpdate(messageId, {
      'encryptionMetadata.senderEncryptedKey': newSenderEncryptedKey,
      'senderKeyRecovery.needed': false,
      'senderKeyRecovery.senderPublicKey': null,
      'senderKeyRecovery.senderKeyId': null
    });

    // Notify sender so their client re-decrypts the message immediately
    if (io) {
      const updated = await Message.findById(messageId).lean();
      io.to(`user_${message.senderId}`).emit('senderKeyUpdated', {
        messageId:          String(message._id),
        encryptedContent:   updated.encryptedContent,
        encryptionMetadata: updated.encryptionMetadata
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update sender key error:', error);
    res.status(500).json({ error: 'Failed to update sender key' });
  }
});

// Recipient tried to recover but couldn't decrypt recipientEncryptedKey either — permanently unrecoverable
router.post('/message/:messageId/recovery-failed', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.session.user.id;
    const message = await Message.findById(messageId).lean();
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (String(message.recipientId) !== userId) {
      return res.status(403).json({ error: 'Only the recipient can mark recovery as failed' });
    }
    console.log(`[Recovery] PERMANENTLY FAILED for message ${messageId} — recipient also lost their key`);
    await Message.findByIdAndUpdate(messageId, {
      'senderKeyRecovery.needed': false,
      'senderKeyRecovery.failed': true,
      'senderKeyRecovery.senderPublicKey': null,
      'senderKeyRecovery.senderKeyId': null
    });
    res.json({ success: true });
  } catch (error) {
    console.error('recovery-failed error:', error);
    res.status(500).json({ error: 'Failed to mark recovery as failed' });
  }
});

// Function to initialize Socket.IO for chat
const initializeChatSocket = (socketIOInstance) => {
  setSocketIO(socketIOInstance);

  io.on('connection', (socket) => {
    console.log('A user connected to the chat service');

    // Authenticate socket connection
    socket.on('authenticate', (userId) => {
      if (userId) {
        socket.userId = String(userId);
        socket.join(`user_${userId}`);
        if (!userSockets.has(socket.userId)) userSockets.set(socket.userId, new Set());
        userSockets.get(socket.userId).add(socket.id);
        console.log(`User ${userId} authenticated and joined their room (socket ${socket.id})`);

        // Check if this user has pending recovery work as a recipient (from MongoDB)
        Message.countDocuments({ recipientId: userId, 'senderKeyRecovery.needed': true })
          .then(count => {
            if (count > 0) socket.emit('processPendingRecovery');
          })
          .catch(() => {});
      }
    });

    socket.on('joinConversation', (otherUserId) => {
      if (socket.userId) {
        socket.join(`conversation_${socket.userId}_${otherUserId}`);
        socket.join(`conversation_${otherUserId}_${socket.userId}`);
        console.log(`User ${socket.userId} joined conversation with ${otherUserId}`);
      }
    });

    socket.on('leaveConversation', (otherUserId) => {
      if (socket.userId) {
        socket.leave(`conversation_${socket.userId}_${otherUserId}`);
        socket.leave(`conversation_${otherUserId}_${socket.userId}`);
        console.log(`User ${socket.userId} left conversation with ${otherUserId}`);
      }
    });

    socket.on('requestResend', async ({ messageId, requesterId }) => {
      if (!socket.userId || socket.userId !== String(requesterId)) return;
      try {
        const message = await Message.findById(messageId).lean();
        if (!message || String(message.recipientId) !== String(requesterId)) return;
        if (message.status === 'replaced') return;
        const senderSockets = userSockets.get(String(message.senderId));
        const targetSocketId = senderSockets && senderSockets.size > 0
          ? [...senderSockets].at(-1) // most recently added
          : null;
        if (targetSocketId) {
          io.to(targetSocketId).emit('resendRequired', {
            messageId:          String(message._id),
            recipientId:        String(message.recipientId),
            encryptedContent:   message.encryptedContent,
            encryptionMetadata: message.encryptionMetadata
          });
        } else {
          // Sender has no active socket — fall back to room (they may reconnect)
          io.to(`user_${message.senderId}`).emit('resendRequired', {
            messageId:          String(message._id),
            recipientId:        String(message.recipientId),
            encryptedContent:   message.encryptedContent,
            encryptionMetadata: message.encryptionMetadata
          });
        }
      } catch (err) {
        console.error('requestResend socket error:', err);
      }
    });

    socket.on('requestSenderRecovery', async ({ messageId, senderId, recipientId }) => {
      if (!socket.userId || socket.userId !== String(senderId)) return;
      try {
        const message = await Message.findById(messageId).lean();
        if (!message) return;
        if (String(message.senderId)    !== String(senderId))    return;
        if (String(message.recipientId) !== String(recipientId)) return;
        if (message.status === 'replaced') return;

        // Sender's current public key so the recipient can re-encrypt for it
        const sender = await User.findById(senderId, 'encryption identity').lean();
        const senderPubKey = sender?.encryption?.publicKey || sender?.identity?.publicKey;
        if (!senderPubKey) return;

        // Persist to MongoDB (survives server restarts)
        await Message.findByIdAndUpdate(messageId, {
          $set: {
            'senderKeyRecovery.needed':          true,
            'senderKeyRecovery.senderPublicKey':  senderPubKey,
            'senderKeyRecovery.senderKeyId':      sender?.encryption?.keyId || sender?.identity?.keyId || String(senderId)
          }
        });

        // Nudge recipient to process pending recovery via REST
        const recipientSockets = userSockets.get(String(recipientId));
        const targetSocketId = recipientSockets && recipientSockets.size > 0
          ? [...recipientSockets].at(-1)
          : null;

        if (targetSocketId) {
          io.to(targetSocketId).emit('processPendingRecovery');
        } else {
          io.to(`user_${recipientId}`).emit('processPendingRecovery');
        }
      } catch (err) {
        console.error('requestSenderRecovery socket error:', err);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        const sockets = userSockets.get(socket.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) userSockets.delete(socket.userId);
        }
      }
      console.log('A user disconnected from the chat service');
    });
  });
};

module.exports = router;
module.exports.setSocketIO = setSocketIO;
module.exports.initializeChatSocket = initializeChatSocket;


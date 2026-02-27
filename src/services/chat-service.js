const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');
const { Message } = require('../models/Message');
const { body, validationResult } = require('express-validator');
const rediLuaService = require('./redis-lua-service');

let io; 

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

      // Update user with encryption details
      await User.findByIdAndUpdate(userId, {
        'encryption.publicKey': publicKey,
        'encryption.keyGeneratedAt': new Date(),
        'encryption.isE2EEEnabled': true,
        'encryption.keyAlgorithm': keyAlgorithm
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
    const user = await User.findById(userId, 'encryption username');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.encryption.isE2EEEnabled || !user.encryption.publicKey) {
      return res.status(400).json({ error: 'User does not have E2EE enabled' });
    }

    res.json({
      userId: user._id,
      username: user.username,
      publicKey: user.encryption.publicKey,
      keyAlgorithm: user.encryption.keyAlgorithm,
      keyGeneratedAt: user.encryption.keyGeneratedAt
    });
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
        User.findById(senderId, 'encryption'),
        User.findById(recipientId, 'encryption')
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

    // Get messages between two users
    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('senderId', 'username')
    .populate('recipientId', 'username');

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
          ]
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
  return User.find(filter, 'username encryption.isE2EEEnabled').limit(20);
}

router.get('/search-users', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.session.user.id;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }
    const currentUser = await User.findById(userId);
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
    const user = await User.findById(userId, 'encryption');
    
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
      'encryption.isE2EEEnabled': false
    });
    
    res.json({ success: true, message: 'E2EE reset successfully' });
  } catch (error) {
    console.error('Reset E2EE error:', error);
    res.status(500).json({ error: 'Failed to reset E2EE' });
  }
});

router.post('/admin/clear-all-e2ee', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
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

// Function to initialize Socket.IO for chat
const initializeChatSocket = (socketIOInstance) => {
  setSocketIO(socketIOInstance);

  io.on('connection', (socket) => {
    console.log('A user connected to the chat service');

    // Authenticate socket connection
    socket.on('authenticate', (userId) => {
      if (userId) {
        socket.userId = userId;
        socket.join(`user_${userId}`);
        console.log(`User ${userId} authenticated and joined their room`);
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

    socket.on('disconnect', () => {
      console.log('A user disconnected from the chat service');
    });
  });
};

module.exports = router;
module.exports.setSocketIO = setSocketIO;
module.exports.initializeChatSocket = initializeChatSocket;


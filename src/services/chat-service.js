const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Message } = require('../models/Message');
const { body, validationResult } = require('express-validator');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// E2EE Setup - Store user's public key
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

// Get public key for a user (for encryption)
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

// Send encrypted message
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

      // Verify both users have E2EE enabled
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

// Search users for starting new conversations
router.get('/search-users', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.session.user.id;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      _id: { $ne: userId },
      'encryption.isE2EEEnabled': true,
      username: { $regex: query, $options: 'i' }
    }, 'username encryption.isE2EEEnabled')
    .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get E2EE status
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

module.exports = router;


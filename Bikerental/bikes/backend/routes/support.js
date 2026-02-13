import express from 'express';
import { authenticateToken } from './auth.js';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Upload attachment
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const REGION = process.env.AWS_REGION;
    const BUCKET = process.env.AWS_S3_BUCKET;
    const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

    if (!REGION || !BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
      return res.status(500).json({ message: 'Storage configuration missing' });
    }

    const s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });

    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const key = `support/${req.user.userId}-${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);
    const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    res.json({ imageUrl: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Get all tickets (User sees own, Admin sees all)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    let query = {};
    
    if (user.role === 'user') {
      query = { userId: req.user.userId };
    } else if (user.role === 'admin') {
      // Admins only see tickets from their location users? Or all?
      // For now, let's say Admins see all for simplicity, or we can filter by user location if needed.
      // Assuming global support for now, or maybe filter by user's location.
      // Let's stick to global for admins/superadmins to catch all issues.
    }

    const tickets = await SupportTicket.find(query)
      .populate('userId', 'name email mobile')
      .populate({ 
        path: 'rentalId',
        populate: { path: 'bikeId', select: 'name brand image' }
      })
      .sort({ updatedAt: -1 });
      
    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
});

// Create a new ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, category, description, rentalId, images } = req.body;
    const user = await User.findById(req.user.userId);

    const ticket = new SupportTicket({
      userId: req.user.userId,
      rentalId,
      subject,
      category,
      priority: ['breakdown', 'accident'].includes(category) ? 'critical' : 'medium',
      messages: [{
        senderId: req.user.userId,
        senderRole: user.role,
        content: description,
        attachments: images || []
      }]
    });

    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Error creating ticket' });
  }
});

// Get specific ticket
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'name email mobile')
      .populate({ 
        path: 'rentalId',
        populate: { path: 'bikeId', select: 'name brand image' }
      })
      .populate('messages.senderId', 'name role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const user = await User.findById(req.user.userId);
    if (user.role === 'user' && ticket.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Error fetching ticket' });
  }
});

// Add message to ticket
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { content, attachments } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    const user = await User.findById(req.user.userId);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ message: 'Cannot reply to a closed ticket' });
    }

    if (user.role === 'user' && ticket.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    ticket.messages.push({
      senderId: req.user.userId,
      senderRole: user.role,
      content,
      attachments: attachments || []
    });

    // If user replies, maybe change status to open/in_progress?
    // If admin replies, change status to in_progress/resolved?
    // Let's keep it simple: just update timestamp.
    ticket.updatedAt = Date.now();
    
    await ticket.save();
    
    // Return the new message with sender info populated
    // We can just return the updated ticket or the new message.
    // Let's return the full updated ticket for simplicity in frontend state update.
    const updatedTicket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'name email mobile')
      .populate({ 
        path: 'rentalId',
        populate: { path: 'bikeId', select: 'name brand image' }
      })
      .populate('messages.senderId', 'name role');
      
    res.json(updatedTicket);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Error adding message' });
  }
});

// Update ticket status (Admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, priority } = req.body;
    const user = await User.findById(req.user.userId);

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Error updating status' });
  }
});

export default router;

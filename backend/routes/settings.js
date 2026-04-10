import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import SiteSettings from '../models/SiteSettings.js';
import multer from 'multer';
import crypto from 'crypto';
import { uploadToS3 } from '../utils/s3.js';

const router = express.Router();

// =====================================
// ✅ MULTER CONFIG (Memory Storage)
// =====================================
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// =====================================
// ✅ FILE VALIDATION
// =====================================
const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
];

// Middleware to ensure superadmin access
const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super Admin access required' });
    }
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying access' });
  }
};

// Get home hero settings (public)
router.get('/home-hero', async (req, res) => {
  try {
    const setting = await SiteSettings.findOne({ key: 'home_hero_image' });
    res.json({ imageUrl: setting ? setting.value : null });
  } catch (error) {
    console.error('Get home hero settings error:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update home hero settings (Super Admin only)
router.put('/home-hero', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const setting = await SiteSettings.findOneAndUpdate(
      { key: 'home_hero_image' },
      { value: imageUrl },
      { upsert: true, new: true }
    );

    res.json({ imageUrl: setting.value });
  } catch (error) {
    console.error('Update home hero settings error:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Upload image (Super Admin only)
router.post('/upload', authenticateToken, requireSuperAdmin, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPG, PNG, WEBP are allowed.' });
    }

    // ✅ Use S3 utility
    const { fileUrl, key } = await uploadToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      req.user.userId
    );

    return res.json({ 
      success: true,
      imageUrl: fileUrl,
      fileUrl: fileUrl, // For consistency
      key: key
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading file',
      details: error.message 
    });
  }
});

export default router;

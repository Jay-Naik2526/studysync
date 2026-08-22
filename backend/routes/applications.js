import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { uploadToCloudinary, getSignedUrl, deleteFromCloudinary } from '../services/cloudinary.js';

const router = express.Router();

// Multer: memory storage, max 5 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Allowed MIME types and their magic bytes
const ALLOWED_TYPES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

/**
 * Verify magic bytes match the claimed MIME type.
 */
function verifyMagicBytes(buffer, mimetype) {
  const expected = ALLOWED_TYPES[mimetype];
  if (!expected) return false;
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => buffer[i] === byte);
}

// ── POST /api/applications ──────────────────────────────────────
// Submit a new application. Multipart when attachment is present.
router.post('/', upload.single('attachment'), authMiddleware, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit applications.' });
    }
    if (!student.mentor) {
      return res.status(400).json({ message: 'You must join a mentor before submitting applications.' });
    }

    const { type, title, reason, fromDate, toDate, subject } = req.body;

    if (!type || !title || !reason || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Type, title, reason, from date, and to date are required.' });
    }

    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ message: 'End date must be on or after start date.' });
    }

    // Handle file attachment
    let attachment = { publicId: null, format: null, bytes: 0, originalName: '' };

    if (req.file) {
      // Re-check size (belt & suspenders)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: 'File must be under 5 MB.' });
      }

      // Check allowlisted MIME type
      if (!ALLOWED_TYPES[req.file.mimetype]) {
        return res.status(400).json({ message: 'Only JPEG, PNG, and PDF files are allowed.' });
      }

      // Verify magic bytes — do not trust client MIME
      if (!verifyMagicBytes(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({ message: 'File content does not match its type. Upload a valid JPEG, PNG, or PDF.' });
      }

      // Upload to Cloudinary (authenticated)
      const uploaded = await uploadToCloudinary(
        req.file.buffer,
        'studysync/applications',
        req.file.mimetype === 'application/pdf' ? 'raw' : 'image'
      );

      attachment = {
        publicId: uploaded.publicId,
        format: uploaded.format,
        bytes: uploaded.bytes,
        originalName: req.file.originalname,
      };
    }

    const application = new Application({
      student: student._id,
      mentor: student.mentor,
      type,
      title,
      reason,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      subject: subject || null,
      attachment,
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('POST /applications error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/applications ───────────────────────────────────────
// List own applications, newest first. Supports ?status= filter.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = { student: req.user.id };
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const applications = await Application.find(query)
      .populate('subject', 'name')
      .populate('mentor', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('GET /applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/applications/:id ───────────────────────────────────
// Own application detail (404 if not owner)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      student: req.user.id,
    })
      .populate('subject', 'name')
      .populate('mentor', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    res.json(application);
  } catch (error) {
    console.error('GET /applications/:id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/applications/:id/withdraw ────────────────────────
// Only allowed while status === 'pending'
router.patch('/:id/withdraw', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      student: req.user.id,
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Can only withdraw pending applications.' });
    }

    // Delete attachment from Cloudinary if present
    if (application.attachment?.publicId) {
      await deleteFromCloudinary(application.attachment.publicId, application.attachment.format);
      application.attachment = { publicId: null, format: null, bytes: 0, originalName: '' };
    }

    application.status = 'withdrawn';
    await application.save();

    res.json(application);
  } catch (error) {
    console.error('PATCH /applications/:id/withdraw error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/applications/:id/attachment ─────────────────────────
// Streams/redirects to a signed URL. Authorized for owner student OR assigned mentor only.
// NOTE: This endpoint is opened in a new browser tab via window.open(), so the
// Authorization header is not available. We accept the JWT from ?token= as a fallback.
router.get('/:id/attachment', async (req, res) => {
  try {
    // Inline auth: header first, then query param fallback (for new-tab opens)
    const { default: jwt } = await import('jsonwebtoken');
    const { default: UserModel } = await import('../models/User.js');

    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    const token = headerToken || req.query.token;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret_key');
    } catch {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const user = await UserModel.findById(decoded.userId || decoded.id).select('_id role');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Authorization: owning student OR assigned mentor
    const isOwner = application.student.toString() === user._id.toString();
    const isMentor = application.mentor.toString() === user._id.toString();

    if (!isOwner && !isMentor) {
      return res.status(403).json({ message: 'Not authorized to view this attachment.' });
    }

    if (!application.attachment?.publicId) {
      return res.status(404).json({ message: 'No attachment on this application.' });
    }

    // Generate a signed URL valid for ~60 seconds
    const signedUrl = getSignedUrl(
      application.attachment.publicId,
      application.attachment.format,
      60
    );

    res.redirect(signedUrl);
  } catch (error) {
    console.error('GET /applications/:id/attachment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

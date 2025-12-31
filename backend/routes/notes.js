import express from 'express';
import multer from 'multer';
import { generateStudyMaterials } from '../services/aiService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB total batch limit
});

router.post('/generate', authMiddleware, upload.array('files', 5), async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const fileBuffers = req.files ? req.files.map(f => f.buffer) : [];
    
    // Pass the buffers to our rotation service
    const aiContent = await generateStudyMaterials(fileBuffers, description, type);

    res.status(200).json({
      title,
      type,
      content: aiContent,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error("Critical Generation Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
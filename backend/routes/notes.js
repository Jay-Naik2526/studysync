import express from 'express';
import multer from 'multer';
import { generateStudyMaterials } from '../services/aiService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 4.5 * 1024 * 1024 } // Vercel limit is 4.5MB
});

// Move upload.array to the FRONT of the middleware chain
router.post('/generate', upload.array('files', 5), authMiddleware, async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const fileBuffers = req.files ? req.files.map(f => f.buffer) : [];
    
    // Check if files exist or are too large for Vercel
    if (fileBuffers.length === 0 && !description) {
        return res.status(400).json({ message: "No content provided." });
    }

    const aiContent = await generateStudyMaterials(fileBuffers, description, type);

    res.status(200).json({
      title,
      type,
      content: aiContent,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error("Generation Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
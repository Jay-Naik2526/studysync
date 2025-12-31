import express from 'express';
import multer from 'multer';
import { generateStudyMaterials } from '../services/aiService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Vercel hard-limit for serverless functions is 4.5MB per request.
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 4.5 * 1024 * 1024 } 
});

/** * CRITICAL: upload.array MUST come before authMiddleware 
 * to parse the multipart body before processing.
 */
router.post('/generate', upload.array('files', 5), authMiddleware, async (req, res) => {
  try {
    const { title, description, type } = req.body;
    
    // Check if files or description exists
    if (!req.files && !description) {
        return res.status(400).json({ message: "Please provide a file or description." });
    }

    const fileBuffers = req.files ? req.files.map(f => f.buffer) : [];
    
    // Generate content using Gemini 3
    const aiContent = await generateStudyMaterials(fileBuffers, description, type);

    res.status(200).json({
      title,
      type,
      content: aiContent,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error("Generation Error:", err.message);
    res.status(500).json({ message: err.message || "Internal AI Failure" });
  }
});

export default router;
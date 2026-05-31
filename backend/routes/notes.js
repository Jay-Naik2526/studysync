import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
import { generateStudyMaterials, chatAboutNotes, generateStudyPlanner } from '../services/aiService.js';
import { authMiddleware } from '../middleware/auth.js';
import Subject from '../models/Subject.js';
import Grade from '../models/Grade.js';

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

// ── Contextual Study Note Chatbot Q&A Route ──
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { noteContent, chatHistory, message } = req.body;
    
    if (!noteContent || !message) {
      return res.status(400).json({ message: "Note content and student message are required." });
    }

    const responseText = await chatAboutNotes(noteContent, chatHistory || [], message);

    res.status(200).json({
      response: responseText,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Chat Q&A Error:", err.message);
    res.status(500).json({ message: err.message || "AI Assistant failed to answer." });
  }
});

// ── Smart Adaptive AI Study Planner Route ──
router.post('/planner', upload.single('policyFile'), authMiddleware, async (req, res) => {
  try {
    const { subjectId, weakTopics, commitHours } = req.body;

    if (!subjectId) {
      return res.status(400).json({ message: "Subject selection is required." });
    }

    // 1. Fetch Subject Attendance Metrics
    const subject = await Subject.findOne({ _id: subjectId, user: req.user.id });
    if (!subject) {
      return res.status(404).json({ message: "Selected subject not found." });
    }

    // 2. Fetch Grades for this Subject
    const grades = await Grade.find({ subject: subjectId, user: req.user.id });
    
    // Format grades list
    const gradesFormatted = grades && grades.length > 0
      ? grades.map(g => `${g.title || 'Assessment'}: ${g.obtainedMarks}/${g.totalMarks}`).join(', ')
      : "No grades recorded yet.";

    const attendanceRate = subject.conductedClasses > 0 
      ? Math.round(((subject.conductedClasses - subject.absentClasses) / subject.conductedClasses) * 100)
      : 100;

    const analyticsData = {
      subjectName: subject.name,
      conductedClasses: subject.conductedClasses,
      absentClasses: subject.absentClasses,
      attendanceRate,
      totalPlannedClasses: subject.totalPlannedClasses || 0,
      marksList: gradesFormatted
    };

    // 3. Parse the uploaded Course Policy file (if any) in-memory
    let policyText = "";
    if (req.file) {
      const buffer = req.file.buffer;
      const originalName = req.file.originalname.toLowerCase();

      if (originalName.endsWith('.pdf')) {
        const pdfData = await pdfParse(buffer);
        policyText = pdfData.text || "";
      } else if (originalName.endsWith('.docx') || originalName.endsWith('.pptx') || originalName.endsWith('.xlsx')) {
        policyText = await new Promise((resolve) => {
          officeParser.parseOffice(buffer, (data) => resolve(data || ""));
        });
      } else {
        policyText = buffer.toString('utf-8');
      }
    }

    // 4. Generate Study Planner using Gemini
    const plannerMarkdown = await generateStudyPlanner(policyText, weakTopics, analyticsData, commitHours || 5);

    res.status(200).json({
      subjectId,
      subjectName: subject.name,
      planner: plannerMarkdown,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error("Planner Generation Error:", err.message);
    res.status(500).json({ message: err.message || "Failed to generate Study Planner." });
  }
});

export default router;
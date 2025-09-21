import express from 'express';
import Grade from '../models/Grade.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const grades = await Grade.find({ user: req.user.id }).populate('subject', 'name');
    res.json(grades);
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, examType, score, maxScore, subject } = req.body;
    const newGrade = new Grade({ title, examType, score, maxScore, subject, user: req.user.id });
    await newGrade.save();
    res.status(201).json(newGrade);
  } catch (error) { res.status(400).json({ message: 'Error creating grade' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const grade = await Grade.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!grade) return res.status(404).json({ message: 'Grade not found' });
    res.json({ message: 'Grade deleted' });
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { score, maxScore } = req.body;
      const updatedGrade = await Grade.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { score, maxScore }, { new: true });
      if (!updatedGrade) return res.status(404).json({ message: 'Grade not found' });
      res.json(updatedGrade);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
import express from 'express';
import Subject from '../models/Subject.js';
import Grade from '../models/Grade.js';
import Todo from '../models/Todo.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const subjects = await Subject.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(subjects);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, totalPlannedClasses, totalMarks } = req.body;
    const newSubject = new Subject({ name, totalPlannedClasses, totalMarks, user: req.user.id });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error) { res.status(400).json({ message: 'Error creating subject' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { conductedClasses, absentClasses, totalPlannedClasses } = req.body;
    const updatedSubject = await Subject.findOneAndUpdate( { _id: req.params.id, user: req.user.id }, { conductedClasses, absentClasses, totalPlannedClasses }, { new: true } );
    if (!updatedSubject) return res.status(404).json({ message: 'Subject not found' });
    res.json(updatedSubject);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const subjectId = req.params.id;
    const subject = await Subject.findOne({ _id: subjectId, user: req.user.id });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    
    await Grade.deleteMany({ subject: subjectId, user: req.user.id });
    await Todo.deleteMany({ subject: subjectId, user: req.user.id });
    await Subject.findByIdAndDelete(subjectId);
    
    res.json({ message: 'Subject deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
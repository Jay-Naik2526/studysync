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
    const { name, portalName, totalPlannedClasses, totalMarks } = req.body;
    const newSubject = new Subject({ name, portalName, totalPlannedClasses, totalMarks, user: req.user.id });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error) { res.status(400).json({ message: 'Error creating subject' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const {
      name, portalName, conductedClasses, absentClasses, totalPlannedClasses, totalMarks,
      weeklyLectures, weeklyLabs,
    } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (portalName !== undefined) updateData.portalName = portalName;
    if (conductedClasses !== undefined) updateData.conductedClasses = conductedClasses;
    if (absentClasses !== undefined) updateData.absentClasses = absentClasses;
    if (totalPlannedClasses !== undefined) updateData.totalPlannedClasses = totalPlannedClasses;
    if (totalMarks !== undefined) updateData.totalMarks = totalMarks;

    // Weekly rates drive the Class Count projections. Clamp to a sane non-negative
    // integer so a stray value can never produce a negative or NaN projection.
    const asCount = (v) => Math.max(0, Math.min(50, Math.floor(Number(v)) || 0));
    if (weeklyLectures !== undefined) updateData.weeklyLectures = asCount(weeklyLectures);
    if (weeklyLabs !== undefined) updateData.weeklyLabs = asCount(weeklyLabs);

    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updateData,
      { new: true }
    );
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
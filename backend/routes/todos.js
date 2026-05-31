import express from 'express';
import Todo from '../models/Todo.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text, subject, dueDate } = req.body;
    const newTodo = new Todo({ text, subject, dueDate, user: req.user.id });
    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (error) { res.status(400).json({ message: 'Error creating todo' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { completed } = req.body;
      const updatedTodo = await Todo.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { completed }, { new: true });
      if (!updatedTodo) return res.status(404).json({ message: 'Todo not found' });
      res.json(updatedTodo);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    res.json({ message: 'Todo deleted' });
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
});

export default router;
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js'; // Correct import

import authRoutes from './routes/auth.js';
import subjectsRoutes from './routes/subjects.js';
import gradesRoutes from './routes/grades.js';
import todosRoutes from './routes/todos.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/subjects', authMiddleware, subjectsRoutes);
app.use('/api/grades', authMiddleware, gradesRoutes);
app.use('/api/todos', authMiddleware, todosRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
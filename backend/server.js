import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import subjectsRoutes from './routes/subjects.js';
import gradesRoutes from './routes/grades.js';
import todosRoutes from './routes/todos.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();
const app = express();

// --- THIS IS THE CRITICAL FIX ---
// Configure CORS to allow requests from your deployed frontend
const corsOptions = {
  origin: 'https://studysync-inky.vercel.app/', // <-- PASTE YOUR VERCEL URL HERE
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
// --- END OF FIX ---

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Public routes for login/register
app.use('/api/auth', authRoutes);

// Protected routes that require a logged-in user
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/subjects', authMiddleware, subjectsRoutes);
app.use('/api/grades', authMiddleware, gradesRoutes);
app.use('/api/todos', authMiddleware, todosRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));

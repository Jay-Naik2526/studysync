import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';

// Import route handlers
import authRoutes from './routes/auth.js';
import subjectsRoutes from './routes/subjects.js';
import gradesRoutes from './routes/grades.js';
import todosRoutes from './routes/todos.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();
const app = express();

// Middleware
// ⚠️ IMPORTANT: cors() allows your Vercel frontend to access this backend
app.use(cors()); 
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/subjects', authMiddleware, subjectsRoutes);
app.use('/api/grades', authMiddleware, gradesRoutes);
app.use('/api/todos', authMiddleware, todosRoutes);

// Root Route (Health Check)
app.get('/', (req, res) => {
    res.send('StudySync Backend is Running! 🚀');
});

// Hugging Face Spaces uses port 7860
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
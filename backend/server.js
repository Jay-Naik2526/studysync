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
import notesRoutes from './routes/notes.js';
dotenv.config();
const app = express();

// Middleware
app.use(cors({
    origin: "*", 
    credentials: true
}));
app.use(express.json());

// --- DATABASE CONNECTION (Optimized for Serverless) ---
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGODB_URI);
        isConnected = db.connections[0].readyState;
        console.log('MongoDB connected successfully.');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        // Do not throw here, let the route handler catch it
    }
};

// Middleware to ensure DB is connected before handling any request
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/subjects', authMiddleware, subjectsRoutes);
app.use('/api/grades', authMiddleware, gradesRoutes);
app.use('/api/todos', authMiddleware, todosRoutes);
app.use('/api/notes', authMiddleware, notesRoutes);
app.get('/', (req, res) => {
    res.send('StudySync Backend is Live on Vercel! 🚀');
});

// --- VERCEL SETUP ---
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
}

export default app;
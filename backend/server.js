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
// ⚠️ CORS is enabled so your Vercel Frontend can talk to this Backend
app.use(cors({
    origin: "*", // Allow all origins (easiest for Vercel)
    credentials: true
}));
app.use(express.json());

// Connect to MongoDB
// (Vercel "Serverless Functions" connect on every request, which is fine for this scale)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/subjects', authMiddleware, subjectsRoutes);
app.use('/api/grades', authMiddleware, gradesRoutes);
app.use('/api/todos', authMiddleware, todosRoutes);

// Root Route (Health Check)
app.get('/', (req, res) => {
    res.send('StudySync Backend is Live on Vercel! 🚀');
});

// --- VERCEL SETUP ---
const PORT = process.env.PORT || 5000;

// 1. Local Development: Start the server normally
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
}

// 2. Vercel Production: Export the app (Vercel handles the listening)
export default app;
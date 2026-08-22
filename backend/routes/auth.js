import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateMentorCode } from '../services/mentorCode.js';

const router = express.Router();

// --- Register a new user ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, mentorSignupCode, department, employeeId } = req.body;

        // Validate role
        const validRoles = ['student', 'mentor'];
        const chosenRole = role || 'student';
        if (!validRoles.includes(chosenRole)) {
            return res.status(400).json({ message: 'Invalid role. Only student and mentor are allowed.' });
        }

        // Mentor registration requires a matching signup code
        if (chosenRole === 'mentor') {
            if (!mentorSignupCode || mentorSignupCode !== process.env.MENTOR_SIGNUP_CODE) {
                return res.status(403).json({ message: 'Invalid mentor signup code.' });
            }
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists.' });

        user = new User({
            name,
            email,
            password,
            role: chosenRole,
            ...(chosenRole === 'mentor' && {
                department: department || '',
                employeeId: employeeId || '',
            }),
        });
        await user.save();

        // Generate a unique mentor code for mentor accounts
        if (chosenRole === 'mentor') {
            await generateMentorCode(user._id);
        }

        res.status(201).json({ message: 'Account created successfully.' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Login a user ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

        // The token is created with 'userId'
        const payload = { userId: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret_key', {
            expiresIn: '7d',
        });

        const userObj = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'student',
        };

        // Include mentorCode for mentor accounts
        if (user.role === 'mentor' && user.mentorCode) {
            userObj.mentorCode = user.mentorCode;
        }

        res.json({ token, user: userObj });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
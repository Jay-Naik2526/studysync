import express from 'express';
import User from '../models/User.js';
import { generateMentorCode } from '../services/mentorCode.js';

const router = express.Router();

// --- GET /api/profile ---
// Return the current user's full profile, with populated mentor info for students
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('mentor', 'name email department');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    console.error('GET /profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- PATCH /api/profile ---
// Update own profile fields. Role is NOT updatable.
router.patch('/', async (req, res) => {
  try {
    const { name, rollNo, division, program, semester, department, employeeId } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Common fields
    if (name !== undefined) user.name = name;

    // Student-only fields
    if (user.role === 'student') {
      if (rollNo !== undefined) user.rollNo = rollNo;
      if (division !== undefined) user.division = division;
      if (program !== undefined) user.program = program;
      if (semester !== undefined) user.semester = semester;
    }

    // Mentor-only fields
    if (user.role === 'mentor') {
      if (department !== undefined) user.department = department;
      if (employeeId !== undefined) user.employeeId = employeeId;
    }

    await user.save();

    const updated = await User.findById(req.user.id)
      .select('-password')
      .populate('mentor', 'name email department');

    res.json(updated);
  } catch (error) {
    console.error('PATCH /profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- POST /api/profile/join-mentor ---
// Student joins a mentor by their MNT-XXXXX code
router.post('/join-mentor', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Mentor code is required.' });
    }

    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'User not found.' });
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'Only students can join a mentor.' });
    }

    const mentor = await User.findOne({ mentorCode: code.toUpperCase().trim(), role: 'mentor' })
      .select('_id name email department');
    if (!mentor) {
      return res.status(404).json({ message: 'Invalid mentor code. Please check and try again.' });
    }

    student.mentor = mentor._id;
    await student.save();

    res.json({
      message: 'Successfully joined mentor.',
      mentor: { name: mentor.name, email: mentor.email, department: mentor.department },
    });
  } catch (error) {
    console.error('POST /profile/join-mentor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- DELETE /api/profile/mentor ---
// Student unlinks from their current mentor
router.delete('/mentor', async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'User not found.' });
    if (student.role !== 'student') {
      return res.status(400).json({ message: 'Only students can leave a mentor.' });
    }

    student.mentor = null;
    await student.save();

    res.json({ message: 'Unlinked from mentor.' });
  } catch (error) {
    console.error('DELETE /profile/mentor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- POST /api/profile/regenerate-code ---
// Mentor regenerates their unique code
router.post('/regenerate-code', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'mentor') {
      return res.status(403).json({ message: 'Only mentors can regenerate a code.' });
    }

    const newCode = await generateMentorCode(user._id);
    res.json({ mentorCode: newCode });
  } catch (error) {
    console.error('POST /profile/regenerate-code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

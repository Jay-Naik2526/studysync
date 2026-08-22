import express from 'express';
import { requireRole } from '../middleware/requireRole.js';
import { assertIsMyMentee } from '../services/mentorAuth.js';
import { overallAttendance, buildMenteeSummary } from '../services/attendanceHelper.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Application from '../models/Application.js';

const router = express.Router();

// All mentor routes require the mentor role
router.use(requireRole('mentor'));

// ── GET /api/mentor/overview ─────────────────────────────────────
// Dashboard aggregate: mentee count, at-risk count, pending applications, mentorCode
router.get('/overview', async (req, res) => {
  try {
    const mentor = await User.findById(req.user.id).select('mentorCode');

    // All mentees
    const mentees = await User.find({ mentor: req.user.id, role: 'student' }).select('_id');
    const menteeIds = mentees.map(m => m._id);

    // Count at-risk mentees
    let atRiskCount = 0;
    for (const mentee of mentees) {
      const subjects = await Subject.find({ user: mentee._id });
      const overall = overallAttendance(subjects);
      if (overall.atRisk) atRiskCount++;
    }

    // Pending application count
    const pendingCount = await Application.countDocuments({
      mentor: req.user.id,
      status: 'pending',
    });

    res.json({
      mentorCode: mentor?.mentorCode || null,
      menteeCount: mentees.length,
      atRiskCount,
      pendingApplicationCount: pendingCount,
    });
  } catch (error) {
    console.error('GET /mentor/overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/mentor/mentees ──────────────────────────────────────
// List of mentees with summary stats
router.get('/mentees', async (req, res) => {
  try {
    const mentees = await User.find({ mentor: req.user.id, role: 'student' })
      .select('_id name email rollNo division program semester')
      .sort({ name: 1 });

    const results = [];
    for (const mentee of mentees) {
      const subjects = await Subject.find({ user: mentee._id });
      const overall = overallAttendance(subjects);

      const pendingApps = await Application.countDocuments({
        student: mentee._id,
        mentor: req.user.id,
        status: 'pending',
      });

      // Get last sync time
      const { default: SapCredentials } = await import('../models/SapCredentials.js');
      const sapCreds = await SapCredentials.findOne({ userId: mentee._id })
        .select('lastSync lastSyncStatus');

      results.push({
        _id: mentee._id,
        name: mentee.name,
        email: mentee.email,
        rollNo: mentee.rollNo,
        division: mentee.division,
        program: mentee.program,
        semester: mentee.semester,
        attendance: overall,
        pendingApplications: pendingApps,
        lastSync: sapCreds?.lastSync || null,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('GET /mentor/mentees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/mentor/mentees/:studentId ───────────────────────────
// Full detail for one student
router.get('/mentees/:studentId', async (req, res) => {
  try {
    const student = await assertIsMyMentee(req.user.id, req.params.studentId);

    const summary = await buildMenteeSummary(student._id, {
      includeSubjects: true,
      includeGrades: true,
    });

    // Recent applications (last 10)
    const applications = await Application.find({
      student: student._id,
      mentor: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type title status fromDate toDate createdAt mentorRemarks decidedAt');

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNo: student.rollNo,
        division: student.division,
        program: student.program,
        semester: student.semester,
      },
      ...summary,
      applications,
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ message: error.message });
    console.error('GET /mentor/mentees/:studentId error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/mentor/mentees/:studentId ─────────────────────────
// Remove a mentee (sets their mentor to null)
router.delete('/mentees/:studentId', async (req, res) => {
  try {
    await assertIsMyMentee(req.user.id, req.params.studentId);

    await User.updateOne(
      { _id: req.params.studentId },
      { $set: { mentor: null } }
    );

    res.json({ message: 'Mentee removed.' });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ message: error.message });
    console.error('DELETE /mentor/mentees/:studentId error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/mentor/applications ────────────────────────────────
// Inbox — defaults to pending. Populates student name/rollNo.
router.get('/applications', async (req, res) => {
  try {
    const statusFilter = req.query.status || 'pending';
    const query = { mentor: req.user.id };

    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    const applications = await Application.find(query)
      .populate('student', 'name email rollNo division')
      .populate('subject', 'name')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('GET /mentor/applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/mentor/applications/:id ──────────────────────────
// Approve or reject an application
router.patch('/applications/:id', async (req, res) => {
  try {
    const { status, mentorRemarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Verify this application belongs to this mentor
    if (application.mentor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not your application to decide.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Can only decide on pending applications.' });
    }

    application.status = status;
    application.mentorRemarks = mentorRemarks || '';
    application.decidedAt = new Date();
    application.decidedBy = req.user.id;
    await application.save();

    res.json(application);
  } catch (error) {
    console.error('PATCH /mentor/applications/:id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/mentor/code/regenerate ────────────────────────────
// Issue a new mentorCode
router.post('/code/regenerate', async (req, res) => {
  try {
    const { generateMentorCode } = await import('../services/mentorCode.js');
    const newCode = await generateMentorCode(req.user.id);
    res.json({ mentorCode: newCode });
  } catch (error) {
    console.error('POST /mentor/code/regenerate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

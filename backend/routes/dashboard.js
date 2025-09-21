import express from 'express';
import Grade from '../models/Grade.js';
import Subject from '../models/Subject.js';
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const allSubjects = await Subject.find({ user: req.user.id });
    const allGrades = await Grade.find({ user: req.user.id }).populate('subject', 'name');
    const totalConducted = allSubjects.reduce((sum, s) => sum + (s.conductedClasses || 0), 0);
    const totalAbsent = allSubjects.reduce((sum, s) => sum + (s.absentClasses || 0), 0);
    const daysPresent = totalConducted - totalAbsent;
    const attendancePercentage = totalConducted > 0 ? (daysPresent / totalConducted) * 100 : 0;
    const totalMarksObtained = allGrades.reduce((sum, grade) => sum + (grade.score || 0), 0);
    const totalMaxMarks = allGrades.reduce((sum, grade) => sum + (grade.maxScore || 0), 0);
    const averageMarksPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
    const marksBySubject = allSubjects.map(subject => { const subjectGrades = allGrades.filter(g => g.subject && g.subject._id.equals(subject._id)); const totalScore = subjectGrades.reduce((acc, g) => acc + g.score, 0); const totalMax = subjectGrades.reduce((acc, g) => acc + g.maxScore, 0); return { subject: subject.name, percentage: totalMax > 0 ? (totalScore / totalMax) * 100 : 0 }; });
    const skippableClassesData = allSubjects.map(subject => { const maxSkippable = Math.floor((subject.totalPlannedClasses || 0) * 0.2); const remaining = maxSkippable - (subject.absentClasses || 0); return { name: subject.name, remaining: remaining > 0 ? remaining : 0 }; });
    const lowAttendanceSubjects = allSubjects.map(subject => { const conducted = subject.conductedClasses || 0; const absent = subject.absentClasses || 0; const percentage = conducted > 0 ? ((conducted - absent) / conducted) * 100 : 100; const maxSkippable = Math.floor((subject.totalPlannedClasses || 0) * 0.2); const remainingSkippable = maxSkippable - absent; return { name: subject.name, percentage, remainingSkippable: remainingSkippable > 0 ? remainingSkippable : 0 }; }).filter(subject => subject.percentage < 80).sort((a, b) => a.percentage - b.percentage);
    res.json({ stats: { attendance: Math.round(attendancePercentage), averageMarks: Math.round(averageMarksPercentage), daysPresent, absences: totalAbsent, subjects: allSubjects.length, totalMarks: Math.round(totalMarksObtained) }, charts: { marksBySubject, skippableClassesData }, lowAttendanceSubjects });
  } catch (error) { res.status(500).json({ message: 'A critical error occurred while fetching dashboard data.' }); }
});
export default router;
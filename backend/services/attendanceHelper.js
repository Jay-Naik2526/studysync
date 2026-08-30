import Subject from '../models/Subject.js';
import Grade from '../models/Grade.js';
import SapCredentials from '../models/SapCredentials.js';

// The college mandates 80% attendance. This is the single source of truth for the
// backend; the frontend mirrors it in src/constants.js. They must stay equal — a
// mismatch previously made the mentor dashboard report a 77% student as safe while
// the UI beside it coloured them at risk.
export const AT_RISK_THRESHOLD = 80;

/**
 * Compute attendance stats for a single subject.
 * Shared between student and mentor views so they can never drift apart.
 *
 * @param {Object} subject — a Subject document (or plain object with same fields)
 * @returns {{ attended: number, conducted: number, absent: number, percentage: number|null, atRisk: boolean }}
 */
export function subjectAttendance(subject) {
  const conducted = subject.conductedClasses || 0;
  const absent = subject.absentClasses || 0;
  const attended = conducted - absent;
  const percentage = conducted > 0 ? (attended / conducted) * 100 : null;
  return {
    attended,
    conducted,
    absent,
    percentage: percentage !== null ? Math.round(percentage * 100) / 100 : null,
    atRisk: percentage !== null && percentage < AT_RISK_THRESHOLD,
  };
}

/**
 * Compute overall attendance across all subjects for a student.
 *
 * @param {Array} subjects — array of Subject documents
 * @returns {{ attended: number, conducted: number, percentage: number|null, atRisk: boolean }}
 */
export function overallAttendance(subjects) {
  const conducted = subjects.reduce((sum, s) => sum + (s.conductedClasses || 0), 0);
  const absent = subjects.reduce((sum, s) => sum + (s.absentClasses || 0), 0);
  const attended = conducted - absent;
  const percentage = conducted > 0 ? (attended / conducted) * 100 : null;
  return {
    attended,
    conducted,
    percentage: percentage !== null ? Math.round(percentage * 100) / 100 : null,
    atRisk: percentage !== null && percentage < AT_RISK_THRESHOLD,
  };
}

/**
 * Build a full mentee summary object for a single student.
 * Used by both the mentee list and the mentee detail endpoints.
 *
 * @param {string} studentId
 * @param {Object} options  — { includeSubjects, includeGrades, includeBacklog }
 * @returns {Object} mentee summary
 */
export async function buildMenteeSummary(studentId, { includeSubjects = false, includeGrades = false } = {}) {
  const [subjects, sapCreds] = await Promise.all([
    Subject.find({ user: studentId }).sort({ name: 1 }),
    SapCredentials.findOne({ userId: studentId }).select('lastSync lastSyncStatus'),
  ]);

  const overall = overallAttendance(subjects);

  const summary = {
    overall,
    lastSync: sapCreds?.lastSync || null,
    lastSyncStatus: sapCreds?.lastSyncStatus || null,
  };

  if (includeSubjects) {
    summary.subjects = subjects.map(s => ({
      _id: s._id,
      name: s.name,
      conductedClasses: s.conductedClasses || 0,
      absentClasses: s.absentClasses || 0,
      conductedLectures: s.conductedLectures || 0,
      absentLectures: s.absentLectures || 0,
      conductedLabs: s.conductedLabs || 0,
      absentLabs: s.absentLabs || 0,
      weeklyLectures: s.weeklyLectures || 0,
      weeklyLabs: s.weeklyLabs || 0,
      totalPlannedClasses: s.totalPlannedClasses || 0,
      ...subjectAttendance(s),
    }));
  }

  if (includeGrades) {
    const grades = await Grade.find({ user: studentId }).populate('subject', 'name').sort({ createdAt: -1 });
    summary.grades = grades.map(g => ({
      _id: g._id,
      title: g.title,
      examType: g.examType,
      score: g.score,
      maxScore: g.maxScore,
      subject: g.subject ? { _id: g.subject._id, name: g.subject.name } : null,
    }));
  }

  return summary;
}

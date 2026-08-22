import User from '../models/User.js';

/**
 * Authorization choke-point for mentor routes.
 * Every mentor endpoint that touches a student's data must call this first.
 * Never trust a studentId from the request without passing it through here.
 *
 * @param {string} mentorId  – req.user.id of the logged-in mentor
 * @param {string} studentId – the student whose data the mentor wants to access
 * @returns {Object} the student document (safe fields only)
 * @throws {Error} 403 if the student is not assigned to this mentor
 */
export async function assertIsMyMentee(mentorId, studentId) {
  const student = await User.findOne({ _id: studentId, mentor: mentorId, role: 'student' })
                            .select('_id name email rollNo division program semester');
  if (!student) {
    const err = new Error('Not your mentee.');
    err.status = 403;
    throw err;
  }
  return student;
}

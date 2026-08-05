import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  portalName: { type: String, trim: true, default: '' },
  // This field will store the overall total marks (e.g., 50 or 100)
  totalMarks: { type: Number, required: true, default: 100 },
  conductedClasses: { type: Number, default: 0 },
  absentClasses: { type: Number, default: 0 },
  totalPlannedClasses: { type: Number, default: 0 },

  // Conducted/absent split by session kind, filled in by the SAP sync. Lectures and labs
  // run at different weekly rates, so the Class Count page projects them separately.
  conductedLectures: { type: Number, default: 0 },
  absentLectures:    { type: Number, default: 0 },
  conductedLabs:     { type: Number, default: 0 },
  absentLabs:        { type: Number, default: 0 },

  // How many of each run per week — entered by the user on the Class Count page.
  weeklyLectures: { type: Number, default: 0 },
  weeklyLabs:     { type: Number, default: 0 },
  user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
}, { timestamps: true });

export default mongoose.model('Subject', subjectSchema);
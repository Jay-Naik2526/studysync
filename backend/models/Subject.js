import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // This field will store the overall total marks (e.g., 50 or 100)
  totalMarks: { type: Number, required: true, default: 100 },
  conductedClasses: { type: Number, default: 0 },
  absentClasses: { type: Number, default: 0 },
  totalPlannedClasses: { type: Number, default: 0 },
  user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
}, { timestamps: true });

export default mongoose.model('Subject', subjectSchema);
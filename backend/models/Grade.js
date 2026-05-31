import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: { type: String, required: true, enum: ['midterm', 'assignment', 'final', 'quiz'] },
  score: { type: Number, required: true, default: 0 },
  maxScore: { type: Number, required: true, default: 10 },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
}, { timestamps: true });

export default mongoose.model('Grade', gradeSchema);
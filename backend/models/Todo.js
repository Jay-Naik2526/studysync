import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  dueDate: { type: Date },
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

export default mongoose.model('Todo', todoSchema);
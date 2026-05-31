import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  detailedNotes: { type: String }, // Markdown format
  shortNotes: { type: String },    // Markdown format
  flashcards: [{ question: String, answer: String }],
  quiz: [{ 
    question: String, 
    options: [String], 
    correctAnswer: String 
  }]
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);
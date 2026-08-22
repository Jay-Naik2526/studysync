import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Admin' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student', index: true },

  // Student profile
  rollNo:   { type: String, trim: true, default: '' },
  division: { type: String, trim: true, default: '' },
  program:  { type: String, trim: true, default: '' },
  semester: { type: String, trim: true, default: '' },

  // Student -> mentor link
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

  // Mentor profile
  department: { type: String, trim: true, default: '' },
  employeeId: { type: String, trim: true, default: '' },
  mentorCode: { type: String, unique: true, sparse: true },  // e.g. "MNT-7K2F9"
}, { timestamps: true });

// This function automatically hashes the password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model('User', userSchema);
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mentor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // denormalised at submit time

  type: {
    type: String,
    enum: ['sick_leave', 'test_absence', 'general_leave', 'retest_request', 'other'],
    required: true,
  },

  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null }, // optional
  title:   { type: String, required: true, trim: true, maxlength: 150 },
  reason:  { type: String, required: true, trim: true, maxlength: 2000 },
  fromDate: { type: Date, required: true },
  toDate:   { type: Date, required: true },

  attachment: {
    publicId:     { type: String, default: null },  // Cloudinary public_id
    format:       { type: String, default: null },
    bytes:        { type: Number, default: 0 },
    originalName: { type: String, default: '' },
  },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'withdrawn'], default: 'pending', index: true },
  mentorRemarks: { type: String, default: '', maxlength: 1000 },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Compound index for the mentor inbox (filter by status, sort by newest)
applicationSchema.index({ mentor: 1, status: 1, createdAt: -1 });

// Validate toDate >= fromDate
applicationSchema.pre('validate', function (next) {
  if (this.toDate && this.fromDate && this.toDate < this.fromDate) {
    this.invalidate('toDate', 'End date must be on or after start date.');
  }
  next();
});

export default mongoose.model('Application', applicationSchema);

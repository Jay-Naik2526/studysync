import mongoose from 'mongoose';

// One row of the SAP detail report: a single hour of a single class on a single day.
// The whole set is replaced on every sync, so it always mirrors the latest report.
const attendanceRecordSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectName: { type: String, required: true },
  kind:        { type: String, enum: ['lecture', 'lab'], default: 'lecture' },
  date:        { type: String, required: true },          // yyyy-mm-dd (IST calendar day)
  start:       { type: Number, default: null },           // minutes after midnight
  end:         { type: Number, default: null },
  status:      { type: String, enum: ['P', 'A', 'NU'], required: true },
});

attendanceRecordSchema.index({ user: 1, date: 1 });

export default mongoose.model('AttendanceRecord', attendanceRecordSchema);

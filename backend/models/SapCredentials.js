import mongoose from 'mongoose';

const sapCredentialsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // Stored encrypted as { iv, encrypted, authTag }
  encryptedUsername: { type: Object, required: true },
  encryptedPassword: { type: Object, required: true },

  // Sync state
  lastSync:        { type: Date,   default: null },
  lastSyncStatus:  { type: String, enum: ['success', 'failed', 'running', null], default: null },
  lastSyncMessage:    { type: String, default: '' },
  lastSyncDetails:    { type: Array,  default: [] },
  lastAttendanceDate: { type: Date,   default: null },

  // Microsoft Calendar Feed Sync state
  microsoftCalendarUrl:    { type: String, default: null },
  lastCalendarSync:        { type: Date,   default: null },
  lastCalendarSyncMessage: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('SapCredentials', sapCredentialsSchema);

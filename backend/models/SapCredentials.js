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
  lastSyncProgress:   { type: String, default: '' },
  lastSyncMessage:    { type: String, default: '' },
  lastSyncDetails:    { type: Array,  default: [] },
  lastAttendanceDate: { type: Date,   default: null },

  // Last-used report settings, remembered from manual syncs. The daily job runs with
  // no browser attached, so it has no other way to know which semester to request —
  // a user who has never synced manually is skipped until they do so once.
  academicYear: { type: String, default: null },
  semester:     { type: String, default: null },

  // Daily auto-sync (opt-in — off until the user turns the toggle on)
  autoSyncEnabled:    { type: Boolean, default: false },
  lastAutoSync:       { type: Date,   default: null },
  lastAutoSyncStatus: { type: String, enum: ['success', 'failed', null], default: null },
  // Consecutive auto-sync failures. After 3 the job disables itself for this user so a
  // changed SAP password can't cause repeated failed logins (and a portal lockout).
  autoSyncFailures:   { type: Number, default: 0 },

  // Microsoft Calendar Feed Sync state
  microsoftCalendarUrl:    { type: String, default: null },
  lastCalendarSync:        { type: Date,   default: null },
  lastCalendarSyncMessage: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('SapCredentials', sapCredentialsSchema);

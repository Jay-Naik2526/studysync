import express from 'express';
import { authMiddleware }   from '../middleware/auth.js';
import SapCredentials       from '../models/SapCredentials.js';
import Subject              from '../models/Subject.js';
import { encryptCredential, decryptCredential, scrapeSAPAttendance } from '../services/sapScraper.js';

const router = express.Router();

// ── POST /api/sap/credentials — save encrypted SAP login ──────────
router.post('/credentials', authMiddleware, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required.' });

  try {
    const encU = encryptCredential(username);
    const encP = encryptCredential(password);

    await SapCredentials.findOneAndUpdate(
      { userId: req.user.id },
      { encryptedUsername: encU, encryptedPassword: encP },
      { upsert: true, new: true }
    );

    res.json({ message: 'SAP credentials saved securely.' });
  } catch (err) {
    console.error('Save credentials error:', err);
    res.status(500).json({ message: 'Failed to save credentials.' });
  }
});

// ── GET /api/sap/status — check if credentials exist + last sync ──
router.get('/status', authMiddleware, async (req, res) => {
  const creds = await SapCredentials.findOne({ userId: req.user.id });
  if (!creds) return res.json({ connected: false });

  res.json({
    connected:       true,
    lastSync:        creds.lastSync,
    lastSyncStatus:  creds.lastSyncStatus,
    lastSyncMessage: creds.lastSyncMessage,
  });
});

// ── POST /api/sap/sync — trigger a scrape & update attendance ─────
router.post('/sync', authMiddleware, async (req, res) => {
  const creds = await SapCredentials.findOne({ userId: req.user.id });
  if (!creds) return res.status(404).json({ message: 'No SAP credentials found. Connect your portal first.' });

  // Mark as running
  creds.lastSyncStatus = 'running';
  await creds.save();

  // Respond immediately so frontend doesn't time out
  res.json({ message: 'Sync started. Check /api/sap/status for progress.' });

  // Run in background
  (async () => {
    try {
      const username = decryptCredential(creds.encryptedUsername);
      const password = decryptCredential(creds.encryptedPassword);

      // Get this user's StudySync subjects
      const subjects = await Subject.find({ user: req.user.id });
      if (!subjects.length) {
        creds.lastSyncStatus  = 'failed';
        creds.lastSyncMessage = 'No subjects found in StudySync. Add subjects first.';
        await creds.save();
        return;
      }

      const { results, syncedAt } = await scrapeSAPAttendance(username, password, subjects);

      // Update matched subjects
      let updated = 0, skipped = 0;
      for (const r of results) {
        if (r.autoMatched && r.subjectId) {
          await Subject.findByIdAndUpdate(r.subjectId, {
            conductedClasses: r.conducted,
            absentClasses:    r.absent,
          });
          updated++;
        } else {
          skipped++;
        }
      }

      creds.lastSync        = syncedAt;
      creds.lastSyncStatus  = 'success';
      creds.lastSyncMessage = `Updated ${updated} subject(s). ${skipped} course(s) from SAP could not be matched — add more subjects with matching names.`;
      await creds.save();

      console.log(`✅ SAP sync complete: ${updated} updated, ${skipped} unmatched`);
    } catch (err) {
      console.error('SAP sync error:', err.message);
      creds.lastSyncStatus  = 'failed';
      creds.lastSyncMessage = err.message;
      await creds.save();
    }
  })();
});

// ── DELETE /api/sap/credentials — disconnect SAP ──────────────────
router.delete('/credentials', authMiddleware, async (req, res) => {
  await SapCredentials.deleteOne({ userId: req.user.id });
  res.json({ message: 'SAP credentials removed.' });
});

export default router;

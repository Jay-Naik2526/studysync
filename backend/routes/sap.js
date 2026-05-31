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
    lastSyncDetails: creds.lastSyncDetails || [],
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

      // Import AI matcher
      const { matchSubjectWithAI } = await import('../services/aiService.js');

      // Update matched subjects
      let updated = 0, skipped = 0;
      const details = [];

      for (const r of results) {
        let finalMatched = r.autoMatched;
        let finalSubjectId = r.subjectId;
        let finalSubjectName = r.subjectName;
        let finalConfidence = r.confidence;
        let matchedBy = 'heuristics';

        // Fallback: If heuristic/regex failed to match, ask Gemini to analyze it
        if (!finalMatched) {
          try {
            console.log(`🧠 [AI Subject Fallback] Trying to match portal course: "${r.pdfName}" via Gemini...`);
            const aiMatch = await matchSubjectWithAI(r.pdfName, subjects);
            if (aiMatch && aiMatch.matched && aiMatch.subjectId) {
              console.log(`🎉 [AI Subject Fallback] Gemini successfully matched: "${r.pdfName}" ➡️ "${aiMatch.subjectName}" (${aiMatch.confidence}% confident)`);
              finalMatched = true;
              finalSubjectId = aiMatch.subjectId;
              finalSubjectName = aiMatch.subjectName;
              finalConfidence = aiMatch.confidence;
              matchedBy = 'ai';
            }
          } catch (aiErr) {
            console.error(`⚠ [AI Subject Fallback] Gemini match failed: ${aiErr.message}`);
          }
        }

        if (finalMatched && finalSubjectId) {
          await Subject.findByIdAndUpdate(finalSubjectId, {
            conductedClasses: r.conducted,
            absentClasses:    r.absent,
          });
          updated++;
          details.push({
            pdfName: r.pdfName,
            subjectName: finalSubjectName,
            status: 'synced',
            conducted: r.conducted,
            absent: r.absent,
            confidence: finalConfidence,
            matchedBy: matchedBy
          });
        } else {
          skipped++;
          details.push({
            pdfName: r.pdfName,
            subjectName: r.subjectName || '(Unmatched)',
            status: 'unmatched',
            conducted: r.conducted,
            absent: r.absent,
            confidence: r.confidence,
            matchedBy: 'none'
          });
        }
      }

      creds.lastSync        = syncedAt;
      creds.lastSyncStatus  = 'success';
      creds.lastSyncMessage = `Updated ${updated} subject(s). ${skipped} course(s) from SAP could not be matched — add more subjects with matching names.`;
      creds.lastSyncDetails = details;
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

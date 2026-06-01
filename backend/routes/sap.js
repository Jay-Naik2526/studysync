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
    connected:               true,
    lastSync:                creds.lastSync,
    lastSyncStatus:          creds.lastSyncStatus,
    lastSyncMessage:         creds.lastSyncMessage,
    lastSyncDetails:         creds.lastSyncDetails || [],
    lastAttendanceDate:      creds.lastAttendanceDate,
    microsoftCalendarUrl:    creds.microsoftCalendarUrl,
    lastCalendarSync:        creds.lastCalendarSync,
    lastCalendarSyncMessage: creds.lastCalendarSyncMessage,
  });
});

// ── POST /api/sap/sync — trigger a scrape & update attendance ─────
router.post('/sync', authMiddleware, async (req, res) => {
  const creds = await SapCredentials.findOne({ userId: req.user.id });
  if (!creds) return res.status(404).json({ message: 'No SAP credentials found. Connect your portal first.' });

  // The SAP Portal is closed from 7:00 AM to 6:00 PM IST (UTC+5:30)
  const now = new Date();
  // Convert current UTC time to IST timezone components
  const istDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateStr);
  const istHour = istDate.getHours();
  const istMinutes = istDate.getMinutes();
  
  if (istHour >= 7 && istHour < 18) {
    return res.status(400).json({ 
      message: 'The SAP portal is closed for syncing between 7:00 AM and 6:00 PM IST. Please try syncing after 6:00 PM IST.' 
    });
  }

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

      const { results, syncedAt, latestAttendanceDate } = await scrapeSAPAttendance(username, password, subjects);

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

      creds.lastSync            = syncedAt;
      creds.lastSyncStatus      = 'success';
      creds.lastSyncMessage     = `Updated ${updated} subject(s). ${skipped} course(s) from SAP could not be matched — add more subjects with matching names.`;
      creds.lastSyncDetails     = details;
      creds.lastAttendanceDate  = latestAttendanceDate;
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

// ── POST /api/sap/calendar — save/update Microsoft Calendar feed URL ─
router.post('/calendar', authMiddleware, async (req, res) => {
  const { calendarUrl } = req.body;
  if (!calendarUrl) {
    return res.status(400).json({ message: 'Calendar Feed URL is required.' });
  }

  try {
    // Basic validation to check if it's a valid webcal/https url
    if (!calendarUrl.startsWith('http://') && !calendarUrl.startsWith('https://') && !calendarUrl.startsWith('webcal://')) {
      return res.status(400).json({ message: 'Invalid URL format. Must start with https:// or webcal://' });
    }

    // Convert webcal to https so node-fetch can request it directly
    const formattedUrl = calendarUrl.replace(/^webcal:\/\//i, 'https://');

    await SapCredentials.findOneAndUpdate(
      { userId: req.user.id },
      { microsoftCalendarUrl: formattedUrl },
      { upsert: true, new: true }
    );

    res.json({ message: 'Microsoft Teams calendar feed connected successfully.' });
  } catch (err) {
    console.error('Save calendar feed error:', err);
    res.status(500).json({ message: 'Failed to connect calendar feed.' });
  }
});

// ── GET /api/sap/deadlines — fetch and parse Microsoft Teams deadlines ─
router.get('/deadlines', authMiddleware, async (req, res) => {
  const creds = await SapCredentials.findOne({ userId: req.user.id });
  if (!creds || !creds.microsoftCalendarUrl) {
    return res.json([]); // Return empty list if not connected
  }

  try {
    const { fetchMicrosoftDeadlines } = await import('../services/microsoftCalendar.js');
    const deadlines = await fetchMicrosoftDeadlines(creds.microsoftCalendarUrl);

    // Save success sync state
    creds.lastCalendarSync = new Date();
    creds.lastCalendarSyncMessage = 'success';
    await creds.save();

    res.json(deadlines);
  } catch (err) {
    console.error('Calendar sync error:', err.message);
    creds.lastCalendarSyncMessage = err.message;
    await creds.save();
    
    res.status(500).json({ message: `Calendar sync failed: ${err.message}` });
  }
});

export default router;

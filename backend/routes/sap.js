import express from 'express';
import { authMiddleware }   from '../middleware/auth.js';
import SapCredentials       from '../models/SapCredentials.js';
import { encryptCredential } from '../services/sapScraper.js';
import { runSyncForUser, runDailyAutoSync, isPortalOpen } from '../services/syncRunner.js';

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
    lastSyncProgress:        creds.lastSyncProgress,
    lastSyncMessage:         creds.lastSyncMessage,
    lastSyncDetails:         creds.lastSyncDetails || [],
    lastAttendanceDate:      creds.lastAttendanceDate,
    autoSyncEnabled:         creds.autoSyncEnabled,
    lastAutoSync:            creds.lastAutoSync,
    lastAutoSyncStatus:      creds.lastAutoSyncStatus,
    // The toggle needs a saved semester to work with
    autoSyncReady:           Boolean(creds.semester),
    microsoftCalendarUrl:    creds.microsoftCalendarUrl,
    lastCalendarSync:        creds.lastCalendarSync,
    lastCalendarSyncMessage: creds.lastCalendarSyncMessage,
  });
});

// ── POST /api/sap/sync — trigger a scrape & update attendance ─────
router.post('/sync', authMiddleware, async (req, res) => {
  const { academicYear, semester } = req.body;
  if (!semester) {
    return res.status(400).json({ message: 'Please select your Semester/Trimester before syncing.' });
  }

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
  creds.lastSyncStatus   = 'running';
  creds.lastSyncProgress = 'Starting sync…';
  await creds.save();

  // Respond immediately so frontend doesn't time out
  res.json({ message: 'Sync started. Check /api/sap/status for progress.' });

  // Run in background
  (async () => {
    try {
      await runSyncForUser(creds, { academicYear, semester, source: 'manual' });
    } catch (err) {
      console.error('SAP sync error:', err.message);
      creds.lastSyncStatus   = 'failed';
      creds.lastSyncProgress = '';
      creds.lastSyncMessage  = err.message;
      await creds.save();
    }
  })();
});

// ── PATCH /api/sap/auto-sync — turn the nightly job on/off ────────
router.patch('/auto-sync', authMiddleware, async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean')
    return res.status(400).json({ message: '`enabled` must be true or false.' });

  const creds = await SapCredentials.findOne({ userId: req.user.id });
  if (!creds) return res.status(404).json({ message: 'No SAP credentials found. Connect your portal first.' });

  // The job runs headless with no browser to read settings from, so it needs a
  // semester on file. That only gets saved by a successful manual sync.
  if (enabled && !creds.semester) {
    return res.status(400).json({
      message: 'Run one manual sync first — that saves your semester so the daily sync knows what to fetch.',
    });
  }

  creds.autoSyncEnabled = enabled;
  if (enabled) creds.autoSyncFailures = 0; // fresh start when re-enabling
  await creds.save();

  res.json({
    message: enabled
      ? 'Daily auto-sync is on. Your attendance will refresh overnight.'
      : 'Daily auto-sync is off.',
    autoSyncEnabled: creds.autoSyncEnabled,
  });
});

// ── POST /api/sap/cron/run — nightly job entry point ──────────────
// Called by the scheduled GitHub Action, not by the app. Protected by a shared
// secret rather than a user session, since there is no user behind the request.
router.post('/cron/run', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: 'CRON_SECRET is not configured on the server.' });
  if (req.get('x-cron-secret') !== secret) return res.status(401).json({ message: 'Unauthorized.' });

  if (!isPortalOpen()) {
    return res.json({ ran: false, reason: 'SAP portal is closed right now (7:00 AM – 6:00 PM IST).' });
  }

  // Respond immediately — the queue takes far longer than any HTTP timeout allows.
  res.json({ started: true, message: 'Daily auto-sync started.' });

  // { "all": true } syncs every connected user, not just those with auto-sync on
  runDailyAutoSync({ includeAll: req.body?.all === true }).catch(err => console.error('Daily auto-sync crashed:', err));
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

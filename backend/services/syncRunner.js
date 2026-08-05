// ── Shared SAP sync runner ────────────────────────────────────────
// One code path for both the manual "Sync" button and the nightly job, so the two
// can never drift apart. The route used to hold this logic inline.

import SapCredentials from '../models/SapCredentials.js';
import Subject        from '../models/Subject.js';
import { decryptCredential, scrapeSAPAttendance } from './sapScraper.js';

// The SAP portal is closed 7:00 AM – 6:00 PM IST.
const PORTAL_CLOSED_FROM = 7;
const PORTAL_CLOSED_TO   = 18;

export function istHourNow(now = new Date()) {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
}

export function isPortalOpen(now = new Date()) {
  const h = istHourNow(now);
  return !(h >= PORTAL_CLOSED_FROM && h < PORTAL_CLOSED_TO);
}

// A failure that will keep failing until the user does something about it. Retrying
// these wastes a slow scrape and, for a wrong password, risks a portal lockout.
export function isPermanentFailure(err) {
  return err?.code === 'BAD_CREDENTIALS' || err?.code === 'ACCOUNT_LOCKED';
}

function isTransientFailure(err) {
  if (isPermanentFailure(err)) return false;
  return err?.retryable === true ||
    /no rows in it|PDF not received|did not render|Could not click the SUBMIT/i.test(err?.message || '');
}

/**
 * Scrape SAP for one user and write the results onto their subjects.
 * Updates the credential doc's sync state as it goes so the frontend can poll it.
 *
 * @param {object} creds  SapCredentials mongoose doc
 * @param {object} opts   { academicYear, semester, source: 'manual' | 'auto' }
 * @returns {Promise<{updated:number, skipped:number, message:string}>}
 */
export async function runSyncForUser(creds, opts = {}) {
  const source = opts.source || 'manual';
  const academicYear = opts.academicYear || creds.academicYear;
  const semester     = opts.semester     || creds.semester;

  if (!semester) throw new Error('No semester saved for this account. Run a manual sync once first.');

  const username = decryptCredential(creds.encryptedUsername);
  const password = decryptCredential(creds.encryptedPassword);

  const subjects = await Subject.find({ user: creds.userId });
  if (!subjects.length) throw new Error('No subjects found in StudySync. Add subjects first.');

  // SAP intermittently completes the whole flow but hands back an empty report, or never
  // renders the PDF viewer. Both used to surface as a finished sync that updated nothing,
  // which only worked after re-running it manually 2–3 times. Retry in-process instead.
  const MAX_SYNC_ATTEMPTS = 3;
  let scrape = null;

  for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
    try {
      scrape = await scrapeSAPAttendance(username, password, subjects, {
        academicYear,
        semester,
        // Persist each step so the frontend's status polling can show it live
        onProgress: async (msg) => {
          creds.lastSyncProgress = attempt === 1 ? msg : `${msg} (retry ${attempt}/${MAX_SYNC_ATTEMPTS})`;
          await creds.save().catch(() => {});
        },
      });
      break;
    } catch (err) {
      if (!isTransientFailure(err) || attempt === MAX_SYNC_ATTEMPTS) throw err;

      console.warn(`⚠ [${source}] SAP sync attempt ${attempt}/${MAX_SYNC_ATTEMPTS} failed: ${err.message} — retrying…`);
      creds.lastSyncProgress = `SAP returned an empty report — retrying (${attempt + 1}/${MAX_SYNC_ATTEMPTS})…`;
      await creds.save().catch(() => {});
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  const { results, syncedAt, latestAttendanceDate } = scrape;

  creds.lastSyncProgress = 'Updating your subjects…';
  await creds.save().catch(() => {});

  let updated = 0, skipped = 0;
  const details = [];

  for (const r of results) {
    if (r.autoMatched && r.subjectId) {
      await Subject.findByIdAndUpdate(r.subjectId, {
        conductedClasses: r.conducted,
        absentClasses:    r.absent,
        // Keep the lecture/lab split in step with the totals on every sync
        conductedLectures: r.conductedLectures ?? 0,
        absentLectures:    r.absentLectures ?? 0,
        conductedLabs:     r.conductedLabs ?? 0,
        absentLabs:        r.absentLabs ?? 0,
      });
      updated++;
      details.push({
        pdfName: r.pdfName, subjectName: r.subjectName, status: 'synced',
        conducted: r.conducted, absent: r.absent, confidence: r.confidence,
        matchedBy: 'heuristics',
      });
    } else {
      skipped++;
      details.push({
        pdfName: r.pdfName, subjectName: r.subjectName || '(Unmatched)', status: 'unmatched',
        conducted: r.conducted, absent: r.absent, confidence: r.confidence,
        matchedBy: 'none',
      });
    }
  }

  const message = `Updated ${updated} subject(s). ${skipped} course(s) from SAP could not be matched — add more subjects with matching names.`;

  creds.lastSync           = syncedAt;
  creds.lastSyncStatus     = 'success';
  creds.lastSyncProgress   = '';
  creds.lastSyncMessage    = source === 'auto' ? `Auto-synced. ${message}` : message;
  creds.lastSyncDetails    = details;
  creds.lastAttendanceDate = latestAttendanceDate;
  // Remember the settings so the nightly job can reuse them
  if (academicYear) creds.academicYear = academicYear;
  if (semester)     creds.semester     = semester;
  await creds.save();

  console.log(`✅ [${source}] SAP sync complete: ${updated} updated, ${skipped} unmatched`);
  return { updated, skipped, message };
}

// A sync stuck in 'running' for longer than this is treated as dead (crash/restart)
const STALE_LOCK_MS = 30 * 60 * 1000;
// Don't re-sync someone who already synced recently
const MIN_HOURS_BETWEEN_SYNCS = 12;
// Give the portal a breather between users
const GAP_BETWEEN_USERS_MS = 15 * 1000;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Nightly job: sync every user who opted in, strictly one at a time.
 *
 * Sequential by design — each scrape drives a full Chromium instance for ~90s, so
 * running them together would exhaust memory on a small container.
 */
export async function runDailyAutoSync() {
  const startedAt = Date.now();

  if (!isPortalOpen()) {
    const msg = `Skipped: the SAP portal is closed right now (${istHourNow()}:00 IST).`;
    console.log(`🌙 ${msg}`);
    return { ran: false, reason: msg, total: 0, succeeded: 0, failed: 0, skipped: 0 };
  }

  const candidates = await SapCredentials.find({
    autoSyncEnabled: true,
    semester: { $ne: null },
  });

  console.log(`🌙 Daily auto-sync starting — ${candidates.length} user(s) opted in.`);

  let succeeded = 0, failed = 0, skipped = 0;

  for (const creds of candidates) {
    // Never fight a sync that's already in flight (manual run, or a previous job that
    // is somehow still going). A 'running' flag older than STALE_LOCK_MS is stale.
    if (creds.lastSyncStatus === 'running') {
      const age = Date.now() - new Date(creds.updatedAt || 0).getTime();
      if (age < STALE_LOCK_MS) {
        console.log(`  ⏭ ${creds.userId}: a sync is already running — skipping.`);
        skipped++;
        continue;
      }
    }

    // Already up to date
    if (creds.lastSync && Date.now() - new Date(creds.lastSync).getTime() < MIN_HOURS_BETWEEN_SYNCS * 3600_000) {
      console.log(`  ⏭ ${creds.userId}: synced less than ${MIN_HOURS_BETWEEN_SYNCS}h ago — skipping.`);
      skipped++;
      continue;
    }

    // The portal may close mid-run on a long queue
    if (!isPortalOpen()) {
      console.log('  ⏹ SAP portal just closed — stopping the queue here.');
      break;
    }

    try {
      creds.lastSyncStatus   = 'running';
      creds.lastSyncProgress = 'Daily auto-sync starting…';
      await creds.save();

      await runSyncForUser(creds, { source: 'auto' });

      creds.lastAutoSync       = new Date();
      creds.lastAutoSyncStatus = 'success';
      creds.autoSyncFailures   = 0;
      await creds.save();
      succeeded++;
    } catch (err) {
      failed++;
      const permanent = isPermanentFailure(err);
      creds.autoSyncFailures   = (creds.autoSyncFailures || 0) + 1;
      creds.lastAutoSync       = new Date();
      creds.lastAutoSyncStatus = 'failed';
      creds.lastSyncStatus     = 'failed';
      creds.lastSyncProgress   = '';

      // A wrong password can never fix itself, so stop immediately rather than
      // retrying the same bad login every night.
      if (permanent || creds.autoSyncFailures >= MAX_CONSECUTIVE_FAILURES) {
        creds.autoSyncEnabled = false;
        creds.lastSyncMessage = permanent
          ? `Auto-sync turned off — ${err.message}`
          : `Auto-sync turned off after ${creds.autoSyncFailures} failed attempts. Last error: ${err.message}`;
      } else {
        creds.lastSyncMessage = `Auto-sync failed: ${err.message}`;
      }

      await creds.save().catch(() => {});
      console.error(`  ❌ ${creds.userId}: ${err.message}${permanent ? ' (auto-sync disabled)' : ''}`);
    }

    await new Promise(r => setTimeout(r, GAP_BETWEEN_USERS_MS));
  }

  const mins = Math.round((Date.now() - startedAt) / 60000);
  console.log(`🌙 Daily auto-sync done in ~${mins}m — ${succeeded} ok, ${failed} failed, ${skipped} skipped.`);
  return { ran: true, total: candidates.length, succeeded, failed, skipped, minutes: mins };
}

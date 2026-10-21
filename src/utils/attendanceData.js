// Pure helpers over the day-by-day SAP rows ({ date, subjectName, kind, start, end, status }).
// Kept free of React so the maths can be tested on its own.

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const pad = n => String(n).padStart(2, '0');
export const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// yyyy-mm-dd → local Date at midnight (never `new Date('yyyy-mm-dd')`, which is UTC)
export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 0 = Monday … 6 = Sunday
export const weekdayIndex = d => (d.getDay() + 6) % 7;
export const weekdayLabel = i => WEEKDAY_SHORT[i];

export function fmtTime(mins) {
  if (mins === null || mins === undefined) return '';
  const h = Math.floor(mins / 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad(mins % 60)} ${ap}`;
}

export const isMarked = r => r.status !== 'NU';

/**
 * Turns one day's hourly SAP rows into the entries shown to the student.
 * Lectures stay one row each; back-to-back lab hours of the same subject are merged into
 * ONE lab (a 2-hour lab is two rows in SAP).
 */
export function buildEntries(rows) {
  const sorted = [...rows].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const entries = [];
  for (const r of sorted) {
    const prev = entries[entries.length - 1];
    const joins = r.kind === 'lab' && prev && prev.kind === 'lab' &&
      prev.subject === r.subjectName && prev.end !== null && r.start !== null && r.start - prev.end <= 1;
    if (joins) {
      prev.end = r.end ?? prev.end;
      prev.rows.push(r);
    } else {
      entries.push({ subject: r.subjectName, kind: r.kind, start: r.start, end: r.end, rows: [r] });
    }
  }
  return entries.map(e => {
    const marked = e.rows.filter(isMarked);
    const present = marked.filter(r => r.status === 'P').length;
    let status = 'NU';
    if (marked.length) status = present === marked.length ? 'P' : present === 0 ? 'A' : 'mixed';
    return { ...e, hours: e.rows.length, markedHours: marked.length, presentHours: present, status };
  });
}

/** Attended / marked hours per subject, plus the overall total. Not-updated rows are ignored. */
export function subjectTallies(records) {
  const bySubject = new Map();
  let attended = 0, marked = 0;
  for (const r of records) {
    if (!isMarked(r)) continue;
    const t = bySubject.get(r.subjectName) || { attended: 0, marked: 0 };
    t.marked++; marked++;
    if (r.status === 'P') { t.attended++; attended++; }
    bySubject.set(r.subjectName, t);
  }
  return { bySubject, overall: { attended, marked } };
}

export const pct = (a, m) => (m > 0 ? (a / m) * 100 : null);

/**
 * How far from the threshold a tally is.
 *  - above it: `canSkip` more hours can be missed and it still holds
 *  - below it: `needToAttend` hours in a row are required to get back
 * Integer maths, so 80.0% exactly counts as safe.
 */
export function skipBudget(attended, marked, threshold) {
  if (marked === 0) return { canSkip: 0, needToAttend: 0 };
  const t = Math.min(99.99, Math.max(1, threshold));
  if (attended * 100 >= t * marked) {
    return { canSkip: Math.floor((100 * attended - t * marked) / t + 1e-9), needToAttend: 0 };
  }
  return { canSkip: 0, needToAttend: Math.ceil((t * marked - 100 * attended) / (100 - t) - 1e-9) };
}

/** Weekly attendance (Mon–Sun) and the running total at the end of each week. */
export function weeklyTrend(records) {
  const weeks = new Map();
  for (const r of records) {
    if (!isMarked(r)) continue;
    const d = parseDay(r.date);
    d.setDate(d.getDate() - weekdayIndex(d));
    const key = dayKey(d);
    const w = weeks.get(key) || { weekStart: key, present: 0, marked: 0 };
    w.marked++;
    if (r.status === 'P') w.present++;
    weeks.set(key, w);
  }
  let cp = 0, cm = 0;
  return [...weeks.values()]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(w => {
      cp += w.present; cm += w.marked;
      return { ...w, pct: pct(w.present, w.marked), cumPct: pct(cp, cm) };
    });
}

const median = arr => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

/**
 * The repeating weekly timetable, learned from the last six weeks of sessions.
 * Returns an array indexed by weekday (0 = Monday): [{ subject, kind, hours, start }].
 * A class counts for a weekday if it turned up on at least ~40% of that weekday's class
 * days in the window, so a one-off make-up class doesn't become permanent.
 */
export function deriveTimetable(records) {
  const table = Array.from({ length: 7 }, () => []);
  if (!records.length) return table;

  const lastDate = records.reduce((m, r) => (r.date > m ? r.date : m), '');
  const from = parseDay(lastDate);
  from.setDate(from.getDate() - 41);
  const fromKey = dayKey(from);

  // date|subject|kind → { hours, start }
  const groups = new Map();
  const datesByWeekday = Array.from({ length: 7 }, () => new Set());
  for (const r of records) {
    if (r.date < fromKey) continue;
    datesByWeekday[weekdayIndex(parseDay(r.date))].add(r.date);
    const k = `${r.date}|${r.subjectName}|${r.kind}`;
    const g = groups.get(k) || { date: r.date, subject: r.subjectName, kind: r.kind, hours: 0, start: r.start };
    g.hours++;
    if (r.start !== null && (g.start === null || r.start < g.start)) g.start = r.start;
    groups.set(k, g);
  }

  const seen = Array.from({ length: 7 }, () => new Map());
  for (const g of groups.values()) {
    const wd = weekdayIndex(parseDay(g.date));
    const k = `${g.subject}|${g.kind}`;
    if (!seen[wd].has(k)) seen[wd].set(k, { subject: g.subject, kind: g.kind, hoursList: [], starts: [] });
    const s = seen[wd].get(k);
    s.hoursList.push(g.hours);
    if (g.start !== null) s.starts.push(g.start);
  }

  // A weekday only counts as a regular class day if it ran in at least 3 of the weeks
  // in the window (fewer if the data is that short) — a lone make-up Saturday must not
  // turn into a permanent weekly class.
  const weeksInWindow = new Set(
    [...datesByWeekday.flatMap(s => [...s])].map(d => {
      const x = parseDay(d); x.setDate(x.getDate() - weekdayIndex(x)); return dayKey(x);
    })
  ).size;
  const minDays = Math.min(3, Math.max(1, weeksInWindow));

  for (let wd = 0; wd < 7; wd++) {
    const dayCount = datesByWeekday[wd].size;
    if (dayCount < minDays) continue;
    for (const s of seen[wd].values()) {
      if (s.hoursList.length < Math.max(1, Math.ceil(dayCount * 0.4))) continue;
      table[wd].push({
        subject: s.subject, kind: s.kind,
        hours: median(s.hoursList),
        start: s.starts.length ? median(s.starts) : null,
      });
    }
    table[wd].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  }
  return table;
}

/**
 * The next `count` class days from `today` that have classes, each as a list of
 * { key, subject, kind, hours }. Days SAP has already marked are skipped (they are in the
 * totals); days SAP lists but has not marked yet use SAP's own rows; anything further
 * ahead comes from the learned timetable.
 */
export function upcomingDays(records, timetable, today, count = 8) {
  const byDate = new Map();
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }

  const days = [];
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 70 && days.length < count; i++, cursor.setDate(cursor.getDate() + 1)) {
    const date = dayKey(cursor);
    const wd = weekdayIndex(cursor);
    const rows = byDate.get(date);
    let entries;
    if (rows) {
      if (rows.some(isMarked)) continue; // already counted
      entries = buildEntries(rows).map(e => ({ subject: e.subject, kind: e.kind, hours: e.hours }));
    } else {
      entries = timetable[wd].map(e => ({ subject: e.subject, kind: e.kind, hours: e.hours }));
    }
    if (!entries.length) continue;
    days.push({
      date, weekday: wd,
      entries: entries.map(e => ({ ...e, key: `${date}|${e.subject}|${e.kind}` })),
    });
  }
  return days;
}

/**
 * What the totals become if every upcoming class is held, with `skipped` (a Set of entry
 * keys) missed and the rest attended.
 */
export function projectTallies(records, days, skipped) {
  const { bySubject, overall } = subjectTallies(records);
  const subjects = new Map([...bySubject].map(([k, v]) => [k, { ...v }]));
  const total = { ...overall };
  let skippedHours = 0;

  for (const day of days) {
    for (const e of day.entries) {
      const t = subjects.get(e.subject) || { attended: 0, marked: 0 };
      t.marked += e.hours; total.marked += e.hours;
      if (skipped.has(e.key)) skippedHours += e.hours;
      else { t.attended += e.hours; total.attended += e.hours; }
      subjects.set(e.subject, t);
    }
  }
  return { subjects, overall: total, skippedHours };
}

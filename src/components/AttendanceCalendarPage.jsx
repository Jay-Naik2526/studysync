import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, AlertTriangle, Loader2, BookOpen, FlaskConical } from 'lucide-react';
import { sapAPI } from '../api';
import { ATTENDANCE_THRESHOLD } from '../constants';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// How each kind of day is coloured. "pending" = SAP lists the day but has not marked it yet.
const TONE = {
  all:     'bg-sage-pale border-sage text-sage-dark',
  some:    'bg-caution-pale border-caution/50 text-caution',
  none:    'bg-danger-pale border-danger/40 text-danger',
  pending: 'bg-map border-dashed border-sand-dark text-ink-muted',
  empty:   'bg-parchment border-sand text-ink-faint',
};

const pad = n => String(n).padStart(2, '0');
const monthKey = (y, m) => `${y}-${pad(m + 1)}`; // m is 0-based

// yyyy-mm-dd → local Date at midnight (never `new Date('yyyy-mm-dd')`, which is UTC)
function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtTime(mins) {
  if (mins === null || mins === undefined) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${pad(m)} ${ap}`;
}

/**
 * Turns one day's hourly SAP rows into the entries shown to the student.
 * Lectures stay one row each; back-to-back lab hours of the same subject are merged into
 * ONE lab (a 2-hour lab is two rows in SAP), so the list matches how the day actually ran.
 */
function buildEntries(rows) {
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
    const marked = e.rows.filter(r => r.status !== 'NU');
    const present = marked.filter(r => r.status === 'P').length;
    let status = 'NU';
    if (marked.length) status = present === marked.length ? 'P' : present === 0 ? 'A' : 'mixed';
    return { ...e, hours: e.rows.length, markedHours: marked.length, presentHours: present, status };
  });
}

const STATUS_CHIP = {
  P:     { label: 'Present',      cls: 'bg-sage-pale text-sage-dark' },
  A:     { label: 'Absent',       cls: 'bg-danger-pale text-danger' },
  mixed: { label: 'Partly',       cls: 'bg-caution-pale text-caution' },
  NU:    { label: 'Not updated',  cls: 'bg-map text-ink-muted' },
};

export default function AttendanceCalendarPage({ onNavigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);      // { y, m } month on screen
  const [selected, setSelected] = useState(null);  // 'yyyy-mm-dd'

  const load = useCallback(async () => {
    try {
      const res = await sapAPI.getAttendanceDays();
      setRecords(res.data.records || []);
      setError('');
    } catch {
      setError('Could not load your daily attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // day → rows
  const byDay = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date).push(r);
    }
    return map;
  }, [records]);

  // Open on the month of the most recent day that actually has marked attendance
  useEffect(() => {
    if (cursor || !records.length) return;
    const marked = records.filter(r => r.status !== 'NU');
    const last = (marked.length ? marked : records).reduce((a, r) => (r.date > a ? r.date : a), '');
    const d = parseDay(last);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }, [records, cursor]);

  const dayInfo = useCallback((key) => {
    const rows = byDay.get(key) || [];
    const marked = rows.filter(r => r.status !== 'NU');
    const present = marked.filter(r => r.status === 'P').length;
    let tone = 'empty';
    if (marked.length) tone = present === marked.length ? 'all' : present === 0 ? 'none' : 'some';
    else if (rows.length) tone = 'pending';
    return { rows, tone, present, marked: marked.length };
  }, [byDay]);

  const month = useMemo(() => {
    if (!cursor) return null;
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells = Array.from({ length: lead + daysIn }, (_, i) =>
      i < lead ? null : `${monthKey(cursor.y, cursor.m)}-${pad(i - lead + 1)}`);

    let present = 0, marked = 0;
    for (const key of cells) {
      if (!key) continue;
      const i = dayInfo(key);
      present += i.present; marked += i.marked;
    }
    return { cells, present, marked, pct: marked ? (present / marked) * 100 : null };
  }, [cursor, dayInfo]);

  // Month arrows stop at the first/last month that has any data
  const bounds = useMemo(() => {
    if (!records.length) return null;
    const keys = records.map(r => r.date).sort();
    const lo = parseDay(keys[0]); const hi = parseDay(keys[keys.length - 1]);
    return { lo: lo.getFullYear() * 12 + lo.getMonth(), hi: hi.getFullYear() * 12 + hi.getMonth() };
  }, [records]);

  const step = (delta) => {
    setSelected(null);
    setCursor(c => {
      const idx = c.y * 12 + c.m + delta;
      return { y: Math.floor(idx / 12), m: idx % 12 };
    });
  };
  const cursorIdx = cursor ? cursor.y * 12 + cursor.m : 0;

  const selectedEntries = useMemo(
    () => (selected ? buildEntries(byDay.get(selected) || []) : []),
    [selected, byDay]
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading your calendar…
      </div>
    );
  }

  const todayKey = (() => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; })();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Day by day</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <CalendarRange size={22} className="text-ink-muted" /> Attendance calendar
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          Every day coloured by how many of that day's classes you attended. Tap a day to see each class.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      {!records.length && !error ? (
        <div className="bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-ink mb-1">No daily data yet</p>
          <p className="text-sm text-ink-muted mb-4">
            Run a SAP sync from the Attendance page (the portal is open 6 PM–7 AM IST) and every
            class will show up here.
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate('attendance')}
              className="px-4 py-2 bg-ember text-white text-sm font-bold rounded-lg hover:bg-ember-dark transition-colors">
              Go to Attendance
            </button>
          )}
        </div>
      ) : month && (
        <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
          {/* Month switcher + that month's total */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <button onClick={() => step(-1)} disabled={bounds && cursorIdx <= bounds.lo} aria-label="Previous month"
              className="p-2 rounded-lg border border-sand text-ink-muted hover:bg-map disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center min-w-0">
              <p className="text-base font-display font-bold text-ink">{MONTH_NAMES[cursor.m]} {cursor.y}</p>
              <p className={`text-[11px] font-medium ${month.pct !== null && month.pct < ATTENDANCE_THRESHOLD ? 'text-danger' : 'text-ink-muted'}`}>
                {month.marked
                  ? `${month.present}/${month.marked} classes attended · ${month.pct.toFixed(1)}%`
                  : 'No marked classes this month'}
              </p>
            </div>
            <button onClick={() => step(1)} disabled={bounds && cursorIdx >= bounds.hi} aria-label="Next month"
              className="p-2 rounded-lg border border-sand text-ink-muted hover:bg-map disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5" aria-hidden>
            {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`Attendance for ${MONTH_NAMES[cursor.m]} ${cursor.y}`}>
            {month.cells.map((key, i) => {
              if (!key) return <div key={`b${i}`} />;
              const { tone, present, marked, rows } = dayInfo(key);
              const isSel = selected === key;
              const isToday = key === todayKey;
              return (
                <button key={key} type="button"
                  onClick={() => setSelected(isSel ? null : key)}
                  aria-pressed={isSel}
                  aria-label={`${key}: ${marked ? `${present} of ${marked} classes attended` : rows.length ? 'not updated yet' : 'no classes'}`}
                  className={`flex aspect-square min-h-10 flex-col items-center justify-center rounded-lg border text-sm font-bold transition-shadow ${TONE[tone]} ${isSel ? 'ring-2 ring-ink ring-offset-1 ring-offset-parchment' : ''} ${isToday ? 'underline underline-offset-4' : ''}`}>
                  <span>{Number(key.slice(8))}</span>
                  {marked > 0 && (
                    <span className="hidden sm:block text-[10px] font-medium leading-none mt-0.5">{present}/{marked}</span>
                  )}
                </button>
              );
            })}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted" aria-label="Legend">
            {[['all', 'All attended'], ['some', 'Some missed'], ['none', 'All missed'], ['pending', 'Not updated yet']].map(([t, l]) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded border ${TONE[t]}`} aria-hidden /> {l}
              </li>
            ))}
          </ul>

          {selected && (
            <div className="mt-5 bg-map rounded-xl p-4" aria-live="polite">
              <p className="text-sm font-bold text-ink mb-3">
                {parseDay(selected).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {selectedEntries.length === 0 ? (
                <p className="text-sm text-ink-muted">No classes on this day.</p>
              ) : (
                <ul className="space-y-2.5">
                  {selectedEntries.map((e, i) => {
                    const chip = STATUS_CHIP[e.status];
                    const Icon = e.kind === 'lab' ? FlaskConical : BookOpen;
                    return (
                      <li key={i} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                            <Icon size={13} className="text-ink-muted flex-shrink-0" />
                            <span className="truncate">{e.subject}</span>
                          </p>
                          <p className="text-[11px] text-ink-muted mt-0.5">
                            {fmtTime(e.start)}{e.end !== null ? ` – ${fmtTime(e.end)}` : ''}
                            <span className="text-ink-faint"> · {e.kind === 'lab' ? 'Lab' : 'Lecture'}{e.hours > 1 ? ` (${e.hours} hrs)` : ''}</span>
                            {e.status === 'mixed' && <span> · attended {e.presentHours} of {e.markedHours} hrs</span>}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${chip.cls}`}>{chip.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

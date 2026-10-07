import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calculator, CalendarClock, BookOpen, FlaskConical, AlertTriangle, Loader2 } from 'lucide-react';
import { subjectsAPI, sapAPI } from '../api';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Mirrors the backend's semester windows: odd semesters (I, III, V, VII) start mid-July,
// even ones start in the first week of January. Only a starting suggestion — editable.
function defaultSemesterStart() {
  const ay  = localStorage.getItem('sap_academicYear') || '';
  const sem = localStorage.getItem('sap_semester') || '';
  const m = ay.match(/(\d{4}).*?(\d{4})/);
  const startYear = m ? parseInt(m[1], 10) : new Date().getFullYear();
  const endYear   = m ? parseInt(m[2], 10) : startYear + 1;
  const semNum = ROMAN.indexOf(String(sem).toUpperCase()) + 1; // 0 when unknown
  return semNum && semNum % 2 === 0 ? `${endYear}-01-02` : `${startYear}-07-13`;
}

// Midnight-local parse of a yyyy-mm-dd value. Avoids `new Date('2026-07-13')` which is
// parsed as UTC and can land on the previous day in IST.
function parseDateInput(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Works out how many classes a subject OWES you.
 *
 * Expected = weekly rate × weeks elapsed. Anything SAP has not recorded as conducted in
 * that window is a class that should have run but didn't — a cancelled lecture, an absent
 * professor, a holiday. That difference is the pending backlog.
 */
export function computeBacklog(subject, weeksElapsed) {
  const weeklyLectures = Math.max(0, subject.weeklyLectures || 0);
  const weeklyLabs     = Math.max(0, subject.weeklyLabs || 0);

  let condLec = subject.conductedLectures || 0;
  // Labs are counted as sessions: a 2-hour lab is two back-to-back SAP rows but ONE lab.
  // Subjects synced before sessions were tracked only have the hourly total, so halve it.
  const labHours = subject.conductedLabs || 0;
  let condLab = subject.conductedLabSessions || (labHours > 0 ? Math.ceil(labHours / 2) : 0);

  // Subjects synced before the lecture/lab split existed carry only a combined total.
  // Count it all as lectures and let the UI explain why.
  const totalConducted = subject.conductedClasses || 0;
  const splitMissing   = (condLec + labHours) === 0 && totalConducted > 0;
  if (splitMissing) condLec = totalConducted;

  const expectedLectures = Math.round(weeklyLectures * weeksElapsed);
  const expectedLabs     = Math.round(weeklyLabs * weeksElapsed);

  // Shortfall in each kind separately — a subject can be behind on labs while its
  // lectures are fully up to date, and averaging the two would hide that.
  const pendingLectures = Math.max(0, expectedLectures - condLec);
  const pendingLabs     = Math.max(0, expectedLabs - condLab);

  // The opposite case: extra sessions were run to catch up, or the weekly rate is low.
  const extraLectures = Math.max(0, condLec - expectedLectures);
  const extraLabs     = Math.max(0, condLab - expectedLabs);

  return {
    conductedLectures: condLec, conductedLabs: condLab,
    conducted: condLec + condLab,
    expectedLectures, expectedLabs, expected: expectedLectures + expectedLabs,
    pendingLectures, pendingLabs, pending: pendingLectures + pendingLabs,
    extraLectures, extraLabs, extra: extraLectures + extraLabs,
    splitMissing,
  };
}

function NumberField({ label, icon: Icon, value, onCommit }) {
  const [draft, setDraft] = useState(String(value ?? 0));

  // Re-sync when the saved value changes from elsewhere (e.g. a refetch)
  useEffect(() => { setDraft(String(value ?? 0)); }, [value]);

  const commit = () => {
    const n = Math.floor(Number(draft));
    const safe = Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : 0;
    setDraft(String(safe));
    if (safe !== (value ?? 0)) onCommit(safe);
  };

  return (
    <label className="flex-1 min-w-[104px]">
      <span className="flex items-center gap-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">
        <Icon size={11} /> {label}
      </span>
      <input
        type="number" min="0" max="50" inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="w-full px-3 py-2 bg-white border border-sand rounded-lg text-sm font-bold text-ink focus:outline-none focus:border-ember"
      />
    </label>
  );
}

function SubjectRow({ subject, backlog, onSave }) {
  const b = backlog;
  const noRate = (subject.weeklyLectures || 0) + (subject.weeklyLabs || 0) === 0;

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink truncate">{subject.name}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {b.conducted} conducted
            <span className="text-ink-faint"> · {b.conductedLectures} lectures + {b.conductedLabs} labs</span>
          </p>
        </div>
        {!noRate && (
          <div className="text-right flex-shrink-0">
            <p className={`text-lg font-display font-bold ${b.pending > 0 ? 'text-caution' : 'text-sage-dark'}`}>
              {b.pending}
            </p>
            <p className="text-[10px] text-ink-muted">pending</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <NumberField label="Lectures / week" icon={BookOpen}
          value={subject.weeklyLectures} onCommit={v => onSave(subject._id, { weeklyLectures: v })} />
        <NumberField label="Labs / week (2 hrs = 1)" icon={FlaskConical}
          value={subject.weeklyLabs} onCommit={v => onSave(subject._id, { weeklyLabs: v })} />
      </div>

      {noRate ? (
        <p className="text-[11px] text-ink-muted bg-map rounded-lg px-3 py-2">
          Enter how many lectures and labs this subject has each week to see what is pending.
        </p>
      ) : (
        <div className="bg-map rounded-xl p-3">
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <div>
              <p className="text-base font-display font-bold text-ink">{b.expected}</p>
              <p className="text-[10px] text-ink-muted leading-tight">should have<br />happened</p>
            </div>
            <div>
              <p className="text-base font-display font-bold text-trail-dark">{b.conducted}</p>
              <p className="text-[10px] text-ink-muted leading-tight">actually<br />conducted</p>
            </div>
            <div>
              <p className={`text-base font-display font-bold ${b.pending > 0 ? 'text-caution' : 'text-sage-dark'}`}>
                {b.pending}
              </p>
              <p className="text-[10px] text-ink-muted leading-tight">pending<br />(not taken)</p>
            </div>
          </div>

          {/* Per-kind breakdown — labs and lectures fall behind independently */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted border-t border-sand pt-2">
            <span className="flex items-center gap-1">
              <BookOpen size={10} /> Lectures: {b.conductedLectures}/{b.expectedLectures}
              {b.pendingLectures > 0 && <strong className="text-caution">· {b.pendingLectures} pending</strong>}
            </span>
            <span className="flex items-center gap-1">
              <FlaskConical size={10} /> Labs: {b.conductedLabs}/{b.expectedLabs}
              {b.pendingLabs > 0 && <strong className="text-caution">· {b.pendingLabs} pending</strong>}
            </span>
          </div>

          {b.extra > 0 && (
            <p className="text-[11px] font-medium text-sage-dark mt-2">
              {b.extra} extra session{b.extra > 1 ? 's' : ''} beyond the weekly plan — likely make-up classes.
            </p>
          )}

          {b.splitMissing && (
            <p className="text-[10px] text-ink-muted mt-2">
              Counted as lectures — run a SAP sync to split lectures and labs properly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClassCountPage() {
  const [subjects, setSubjects] = useState([]);
  const [asOfDate, setAsOfDate] = useState(null); // how far the SAP data actually goes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [semesterStart, setSemesterStart] = useState(
    () => localStorage.getItem('cc_semesterStart') || defaultSemesterStart()
  );

  useEffect(() => { localStorage.setItem('cc_semesterStart', semesterStart); }, [semesterStart]);

  const fetchAll = useCallback(async () => {
    try {
      const [subs, status] = await Promise.allSettled([subjectsAPI.getAll(), sapAPI.getStatus()]);
      if (subs.status === 'rejected') throw subs.reason;
      setSubjects(subs.value.data);
      // Measure elapsed weeks against the last date SAP has data for, not today —
      // otherwise a report that is a few days behind shows phantom pending classes.
      if (status.status === 'fulfilled' && status.value.data?.lastAttendanceDate) {
        setAsOfDate(new Date(status.value.data.lastAttendanceDate));
      }
      setError('');
    } catch {
      setError('Could not load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (id, patch) => {
    // Optimistic — the field already shows the new value, so keep the list in step
    setSubjects(list => list.map(s => (s._id === id ? { ...s, ...patch } : s)));
    try {
      await subjectsAPI.update(id, patch);
    } catch {
      setError('Could not save. Check your connection and try again.');
      fetchAll(); // roll back to whatever the server actually has
    }
  };

  const { weeksElapsed, effectiveAsOf } = useMemo(() => {
    const start = parseDateInput(semesterStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Never measure past today, even if SAP lists future (not-yet-held) sessions.
    let asOf = asOfDate && !isNaN(asOfDate) ? new Date(asOfDate) : today;
    asOf.setHours(0, 0, 0, 0);
    if (asOf > today) asOf = today;

    if (!start || asOf < start) return { weeksElapsed: 0, effectiveAsOf: asOf };
    const days = (asOf.getTime() - start.getTime()) / DAY_MS + 1; // inclusive of both ends
    return { weeksElapsed: Math.max(0, days / 7), effectiveAsOf: asOf };
  }, [semesterStart, asOfDate]);

  const rows = useMemo(
    () => subjects.map(s => ({ subject: s, backlog: computeBacklog(s, weeksElapsed) })),
    [subjects, weeksElapsed]
  );

  const totals = useMemo(() => rows.reduce((acc, { backlog: b }) => ({
    expected:  acc.expected + b.expected,
    conducted: acc.conducted + b.conducted,
    pending:   acc.pending + b.pending,
    extra:     acc.extra + b.extra,
  }), { expected: 0, conducted: 0, pending: 0, extra: 0 }), [rows]);

  const startValid  = Boolean(parseDateInput(semesterStart));
  const needsResync = rows.some(({ backlog }) => backlog.splitMissing);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading your subjects…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Backlog</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <Calculator size={22} className="text-ink-muted" /> Class count
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          Compares how many classes should have run by now against how many SAP says actually
          happened. The gap is what your professors still owe you.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchAll} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
        <label className="block">
          <span className="flex items-center gap-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">
            <CalendarClock size={11} /> Semester started on
          </span>
          <input type="date" value={semesterStart} onChange={e => setSemesterStart(e.target.value)}
            className={`w-full sm:w-56 px-3 py-2 bg-white border rounded-lg text-sm text-ink focus:outline-none focus:border-ember ${startValid ? 'border-sand' : 'border-danger'}`} />
        </label>
        <p className="text-[11px] text-ink-muted mt-2">
          {!startValid
            ? 'Pick a valid start date.'
            : weeksElapsed <= 0
              ? 'That date is in the future — no classes counted yet.'
              : `${weeksElapsed.toFixed(1)} weeks of classes so far, counted up to ${effectiveAsOf.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`}
        </p>
      </div>

      {/* Subjects last synced before the lecture/lab split existed carry only a combined
          total, so every session falls into the lecture column until the next sync. */}
      {needsResync && (
        <div className="mb-5 flex items-start gap-2 bg-caution-pale border border-caution/30 rounded-xl px-3 py-2.5">
          <AlertTriangle size={14} className="text-caution mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-ink leading-relaxed">
            <strong>Labs are showing as 0.</strong> These subjects were last synced before
            StudySync could tell lectures and labs apart, so everything is counted as a lecture.
            Run a SAP sync from the Attendance page (the portal is open 6 PM–7 AM IST) and the
            split will fill in.
          </p>
        </div>
      )}

      {subjects.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Should have', value: totals.expected, color: 'text-ink' },
            { label: 'Conducted', value: totals.conducted, color: 'text-trail-dark' },
            { label: 'Pending', value: totals.pending, color: totals.pending > 0 ? 'text-caution' : 'text-sage-dark' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-parchment border border-sand rounded-xl p-3 text-center shadow-sm">
              <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {subjects.length > 0 && totals.extra > 0 && (
        <p className="text-[11px] text-ink-muted -mt-3 mb-5">
          Conducted includes {totals.extra} extra session{totals.extra > 1 ? 's' : ''} beyond the weekly plan,
          so Should have − Conducted + Extra = Pending ({totals.expected} − {totals.conducted} + {totals.extra} = {totals.pending}).
        </p>
      )}

      {subjects.length === 0 ? (
        <div className="bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-ink mb-1">No subjects yet</p>
          <p className="text-sm text-ink-muted">Add subjects on the Attendance page, then come back here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ subject, backlog }) => (
            <SubjectRow key={subject._id} subject={subject} backlog={backlog} onSave={handleSave} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-ink-muted mt-5 mb-2">
        Estimates — the weekly rate is assumed to hold every week, so public holidays and exam
        weeks will also show up as pending.
      </p>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calculator, CalendarClock, BookOpen, FlaskConical, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { subjectsAPI } from '../api';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Odd semesters (I, III, V, VII) run Jul–Nov; even ones run Jan–Apr. Used only as the
// starting suggestion — the user can set any end date they like.
function defaultSemesterEnd() {
  const ay  = localStorage.getItem('sap_academicYear') || '';
  const sem = localStorage.getItem('sap_semester') || '';
  const m = ay.match(/(\d{4}).*?(\d{4})/);
  const startYear = m ? parseInt(m[1], 10) : new Date().getFullYear();
  const endYear   = m ? parseInt(m[2], 10) : startYear + 1;
  const semNum = ROMAN.indexOf(String(sem).toUpperCase()) + 1; // 0 when unknown
  return semNum && semNum % 2 === 0 ? `${endYear}-04-30` : `${startYear}-11-30`;
}

// Midnight-local parse of a yyyy-mm-dd value. Avoids `new Date('2026-11-30')` which is
// parsed as UTC and can land on the previous day in IST.
function parseDateInput(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Projects one subject forward from what SAP has already recorded.
 *
 * `weeksRemaining` is fractional on purpose — with 10 days left a subject running 3
 * lectures a week still has ~4 more, and flooring to whole weeks would report zero.
 */
export function projectSubject(subject, weeksRemaining, thresholdPct) {
  const weeklyLectures = Math.max(0, subject.weeklyLectures || 0);
  const weeklyLabs     = Math.max(0, subject.weeklyLabs || 0);

  let condLec = subject.conductedLectures || 0;
  let condLab = subject.conductedLabs || 0;
  let absLec  = subject.absentLectures || 0;
  let absLab  = subject.absentLabs || 0;

  // Subjects synced before the split existed have only the combined totals. Rather than
  // showing zeroes, treat the whole total as lectures and flag it so the UI can say why.
  const totalConducted = subject.conductedClasses || 0;
  const totalAbsent    = subject.absentClasses || 0;
  const splitMissing   = (condLec + condLab) === 0 && totalConducted > 0;
  if (splitMissing) { condLec = totalConducted; absLec = totalAbsent; }

  const conducted = condLec + condLab;
  const absent    = Math.min(absLec + absLab, conducted); // absent can never exceed conducted
  const attended  = conducted - absent;

  const pendingLectures = Math.round(weeklyLectures * weeksRemaining);
  const pendingLabs     = Math.round(weeklyLabs * weeksRemaining);
  const pending         = pendingLectures + pendingLabs;

  const projectedTotal = conducted + pending;
  const t = thresholdPct / 100;

  // Attending every remaining class is the best case.
  const bestCasePct = projectedTotal > 0 ? ((attended + pending) / projectedTotal) * 100 : null;

  // How many of the remaining classes can still be skipped and still finish on target.
  // Capped at `pending` — you cannot skip more classes than are left.
  const canMiss = Math.max(0, Math.min(pending, Math.floor((attended + pending) - t * projectedTotal)));

  // The flip side: the minimum of the remaining that must be attended.
  const mustAttendRaw = Math.ceil(t * projectedTotal - attended);
  const mustAttend    = Math.min(Math.max(0, mustAttendRaw), pending);
  const reachable     = mustAttendRaw <= pending;

  return {
    conductedLectures: condLec, conductedLabs: condLab,
    conducted, absent, attended,
    pendingLectures, pendingLabs, pending,
    projectedTotal,
    currentPct: conducted > 0 ? (attended / conducted) * 100 : null,
    bestCasePct,
    canMiss, mustAttend, reachable, splitMissing,
  };
}

function NumberField({ label, icon: Icon, value, onCommit }) {
  const [draft, setDraft] = useState(String(value ?? 0));

  // Re-sync when the saved value changes from elsewhere (e.g. a refetch)
  useEffect(() => { setDraft(String(value ?? 0)); }, [value]);

  const commit = () => {
    const n = Math.max(0, Math.min(50, Math.floor(Number(draft))));
    const safe = Number.isFinite(n) ? n : 0;
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

function SubjectRow({ subject, projection, onSave }) {
  const p = projection;
  const pctColor = p.currentPct === null ? 'text-ink-faint'
    : p.currentPct >= 75 ? 'text-sage-dark'
    : p.currentPct >= 65 ? 'text-caution' : 'text-danger';

  const noRate = (subject.weeklyLectures || 0) + (subject.weeklyLabs || 0) === 0;

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink truncate">{subject.name}</p>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {p.conducted} held so far
            <span className="text-ink-faint"> · {p.conductedLectures} lec / {p.conductedLabs} lab</span>
            {p.absent > 0 && <span className="text-danger font-medium"> · {p.absent} missed</span>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-display font-bold ${pctColor}`}>
            {p.currentPct === null ? '—' : `${p.currentPct.toFixed(1)}%`}
          </p>
          <p className="text-[10px] text-ink-muted">now</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <NumberField label="Lectures / week" icon={BookOpen}
          value={subject.weeklyLectures} onCommit={v => onSave(subject._id, { weeklyLectures: v })} />
        <NumberField label="Labs / week" icon={FlaskConical}
          value={subject.weeklyLabs} onCommit={v => onSave(subject._id, { weeklyLabs: v })} />
      </div>

      {noRate ? (
        <p className="text-[11px] text-ink-muted bg-map rounded-lg px-3 py-2">
          Enter how many lectures and labs this subject has each week to project the classes left.
        </p>
      ) : (
        <div className="bg-map rounded-xl p-3">
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div>
              <p className="text-base font-display font-bold text-trail-dark">{p.pending}</p>
              <p className="text-[10px] text-ink-muted leading-tight">left<br />({p.pendingLectures} lec / {p.pendingLabs} lab)</p>
            </div>
            <div>
              <p className="text-base font-display font-bold text-ink">{p.projectedTotal}</p>
              <p className="text-[10px] text-ink-muted leading-tight">total by<br />end</p>
            </div>
            <div>
              <p className="text-base font-display font-bold text-sage-dark">
                {p.bestCasePct === null ? '—' : `${p.bestCasePct.toFixed(1)}%`}
              </p>
              <p className="text-[10px] text-ink-muted leading-tight">if you<br />attend all</p>
            </div>
          </div>

          {!p.reachable ? (
            <p className="text-[11px] font-medium text-danger bg-danger-pale rounded-lg px-3 py-2 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              Even attending every remaining class ends at {p.bestCasePct?.toFixed(1)}% — below your target.
            </p>
          ) : p.canMiss > 0 ? (
            <p className="text-[11px] font-medium text-sage-dark bg-sage-pale rounded-lg px-3 py-2">
              You can still miss <strong>{p.canMiss}</strong> of the {p.pending} remaining
              {' '}(attend at least {p.mustAttend}).
            </p>
          ) : (
            <p className="text-[11px] font-medium text-caution bg-caution-pale rounded-lg px-3 py-2">
              Attend <strong>all {p.pending}</strong> remaining to stay on target.
            </p>
          )}

          {p.splitMissing && (
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [semesterEnd, setSemesterEnd] = useState(
    () => localStorage.getItem('cc_semesterEnd') || defaultSemesterEnd()
  );
  const [threshold, setThreshold] = useState(
    () => Number(localStorage.getItem('cc_threshold')) || 75
  );

  useEffect(() => { localStorage.setItem('cc_semesterEnd', semesterEnd); }, [semesterEnd]);
  useEffect(() => { localStorage.setItem('cc_threshold', String(threshold)); }, [threshold]);

  const fetchSubjects = useCallback(async () => {
    try {
      const { data } = await subjectsAPI.getAll();
      setSubjects(data);
      setError('');
    } catch {
      setError('Could not load subjects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleSave = async (id, patch) => {
    // Optimistic — the field already shows the new value, so keep the list in step
    setSubjects(list => list.map(s => (s._id === id ? { ...s, ...patch } : s)));
    try {
      await subjectsAPI.update(id, patch);
    } catch {
      setError('Could not save. Check your connection and try again.');
      fetchSubjects(); // roll back to whatever the server actually has
    }
  };

  const weeksRemaining = useMemo(() => {
    const end = parseDateInput(semesterEnd);
    if (!end) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // End date is inclusive — a semester ending today still has today's classes.
    const days = (end.getTime() - today.getTime()) / DAY_MS + 1;
    return Math.max(0, days / 7);
  }, [semesterEnd]);

  const rows = useMemo(
    () => subjects.map(s => ({ subject: s, projection: projectSubject(s, weeksRemaining, threshold) })),
    [subjects, weeksRemaining, threshold]
  );

  const totals = useMemo(() => {
    const t = rows.reduce((acc, { projection: p }) => ({
      conducted: acc.conducted + p.conducted,
      attended:  acc.attended + p.attended,
      pending:   acc.pending + p.pending,
      projected: acc.projected + p.projectedTotal,
    }), { conducted: 0, attended: 0, pending: 0, projected: 0 });

    return {
      ...t,
      currentPct:  t.conducted > 0 ? (t.attended / t.conducted) * 100 : null,
      bestCasePct: t.projected > 0 ? ((t.attended + t.pending) / t.projected) * 100 : null,
    };
  }, [rows]);

  const endDateValid = Boolean(parseDateInput(semesterEnd));

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
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Distance remaining</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <Calculator size={22} className="text-ink-muted" /> Class count
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          Classes already held come from your SAP attendance. Add how many run each week and
          this projects how many are still left.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchSubjects} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* Settings */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 min-w-[150px]">
            <span className="flex items-center gap-1 text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">
              <CalendarClock size={11} /> Semester ends
            </span>
            <input type="date" value={semesterEnd} onChange={e => setSemesterEnd(e.target.value)}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-ink focus:outline-none focus:border-ember ${endDateValid ? 'border-sand' : 'border-danger'}`} />
          </label>
          <label className="flex-1 min-w-[150px]">
            <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">
              Attendance target
            </span>
            <select value={threshold} onChange={e => setThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-sand rounded-lg text-sm text-ink focus:outline-none focus:border-ember">
              {[70, 75, 80, 85].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </label>
        </div>
        <p className="text-[11px] text-ink-muted mt-2">
          {!endDateValid
            ? 'Pick a valid end date to project the remaining classes.'
            : weeksRemaining <= 0
              ? 'That date has passed — nothing left to project. Set a later date if the semester is still running.'
              : `About ${weeksRemaining.toFixed(1)} weeks of classes left.`}
        </p>
      </div>

      {/* Totals */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Held', value: totals.conducted, color: 'text-ink' },
            { label: 'Left', value: totals.pending, color: 'text-trail-dark' },
            { label: 'Total by end', value: totals.projected, color: 'text-ink' },
            {
              label: 'If you attend all',
              value: totals.bestCasePct === null ? '—' : `${totals.bestCasePct.toFixed(1)}%`,
              color: 'text-sage-dark',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-parchment border border-sand rounded-xl p-3 text-center shadow-sm">
              <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Subjects */}
      {subjects.length === 0 ? (
        <div className="bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-ink mb-1">No subjects yet</p>
          <p className="text-sm text-ink-muted">Add subjects on the Attendance page, then come back here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ subject, projection }) => (
            <SubjectRow key={subject._id} subject={subject} projection={projection} onSave={handleSave} />
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11px] text-ink-muted mt-5 mb-2">
        <RefreshCw size={11} className="mt-0.5 flex-shrink-0" />
        These are estimates — they assume every week runs the full timetable, so holidays and
        cancelled classes will shift the real numbers.
      </p>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { BookOpen, FlaskConical, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { ATTENDANCE_THRESHOLD } from '../constants';
import {
  subjectTallies, skipBudget, pct, deriveTimetable, upcomingDays, projectTallies,
  parseDay, dayKey, weekdayLabel,
} from '../utils/attendanceData';

const fmtPct = v => (v === null ? '–' : `${v.toFixed(1)}%`);

function StatusLine({ attended, marked }) {
  const b = skipBudget(attended, marked, ATTENDANCE_THRESHOLD);
  if (marked === 0) return <span className="text-ink-muted">No classes yet</span>;
  if (b.needToAttend > 0) {
    return (
      <span className="flex items-center gap-1 text-danger font-bold">
        <ShieldAlert size={12} /> Attend the next {b.needToAttend} hr{b.needToAttend > 1 ? 's' : ''} to reach {ATTENDANCE_THRESHOLD}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sage-dark font-bold">
      <ShieldCheck size={12} /> Can miss {b.canSkip} more hr{b.canSkip === 1 ? '' : 's'}
    </span>
  );
}

export default function SkipPlanner({ records }) {
  const [skipped, setSkipped] = useState(() => new Set());

  const timetable = useMemo(() => deriveTimetable(records), [records]);
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => upcomingDays(records, timetable, today, 8), [records, timetable, today]);

  const now = useMemo(() => subjectTallies(records), [records]);
  const after = useMemo(() => projectTallies(records, days, skipped), [records, days, skipped]);

  const lastMarked = useMemo(
    () => records.reduce((m, r) => (r.status !== 'NU' && r.date > m ? r.date : m), ''),
    [records]
  );
  const staleDays = lastMarked
    ? Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - parseDay(lastMarked)) / 864e5)
    : 0;

  const toggle = (key) => setSkipped(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleDay = (day) => setSkipped(prev => {
    const next = new Set(prev);
    const allSkipped = day.entries.every(e => next.has(e.key));
    day.entries.forEach(e => (allSkipped ? next.delete(e.key) : next.add(e.key)));
    return next;
  });

  const subjectNames = [...new Set([...now.bySubject.keys(), ...after.subjects.keys()])].sort();
  const overallNow = pct(now.overall.attended, now.overall.marked);
  const overallAfter = pct(after.overall.attended, after.overall.marked);
  const willDrop = subjectNames.filter(n => {
    const t = after.subjects.get(n) || { attended: 0, marked: 0 };
    const v = pct(t.attended, t.marked);
    return v !== null && v < ATTENDANCE_THRESHOLD;
  });

  const todayKey = dayKey(today);
  const dayLabel = (d) => {
    const dt = parseDay(d.date);
    const text = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return `${d.date === todayKey ? 'Today' : weekdayLabel(d.weekday)} · ${text}`;
  };

  return (
    <div className="space-y-5">
      {/* Where you stand */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Overall right now</p>
            <p className={`text-3xl font-display font-bold ${overallNow !== null && overallNow < ATTENDANCE_THRESHOLD ? 'text-danger' : 'text-ink'}`}>
              {fmtPct(overallNow)}
            </p>
            <p className="text-[11px] text-ink-muted">{now.overall.attended}/{now.overall.marked} hours attended</p>
          </div>
          <div className="text-right text-xs"><StatusLine attended={now.overall.attended} marked={now.overall.marked} /></div>
        </div>

        <div className="space-y-2">
          {subjectNames.map(name => {
            const t = now.bySubject.get(name) || { attended: 0, marked: 0 };
            const v = pct(t.attended, t.marked);
            return (
              <div key={name} className="bg-map rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink truncate">{name}</p>
                  <p className={`text-sm font-display font-bold flex-shrink-0 ${v !== null && v < ATTENDANCE_THRESHOLD ? 'text-danger' : 'text-ink'}`}>{fmtPct(v)}</p>
                </div>
                <div className="flex items-center justify-between gap-3 mt-0.5 text-[11px] text-ink-muted">
                  <span>{t.attended}/{t.marked} hrs</span>
                  <StatusLine attended={t.attended} marked={t.marked} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-faint mt-3 flex items-start gap-1">
          <Info size={11} className="mt-px flex-shrink-0" />
          Counted in hours, the way SAP records attendance: a lecture is 1 hour and a 2-hour lab is 2.
        </p>
      </div>

      {/* What if */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">What if I skip…</p>
        <p className="text-xs text-ink-muted mb-4">
          Your next class days, from the weekly timetable StudySync learned from your attendance. Tap a day to
          skip all of it, or a single class. Everything else is assumed attended.
        </p>

        {staleDays > 2 && (
          <p className="text-[11px] text-caution bg-caution-pale rounded-lg px-3 py-2 mb-3">
            SAP data runs up to {parseDay(lastMarked).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.
            Classes since then aren't counted yet. Run a sync to bring this up to date.
          </p>
        )}

        {days.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Not enough attendance history to work out your timetable yet. Sync again after a few more weeks of classes.
          </p>
        ) : (
          <div className="space-y-2.5">
            {days.map(day => {
              const allSkipped = day.entries.every(e => skipped.has(e.key));
              return (
                <div key={day.date} className={`rounded-xl border p-3 transition-colors ${allSkipped ? 'bg-danger-pale border-danger/30' : 'bg-map border-sand'}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-bold text-ink">{dayLabel(day)}</p>
                    <button onClick={() => toggleDay(day)}
                      className={`text-[11px] font-bold px-3 py-2 min-h-[36px] rounded-lg border ${allSkipped ? 'bg-danger text-white border-danger' : 'bg-white text-ink-muted border-sand hover:border-sand-dark'}`}>
                      {allSkipped ? 'Skipping all' : 'Skip whole day'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {day.entries.map(e => {
                      const off = skipped.has(e.key);
                      const Icon = e.kind === 'lab' ? FlaskConical : BookOpen;
                      return (
                        <button key={e.key} onClick={() => toggle(e.key)} aria-pressed={off}
                          className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-2 min-h-[36px] rounded-lg border max-w-full ${off ? 'bg-danger-pale border-danger/40 text-danger line-through' : 'bg-white border-sand text-ink'}`}>
                          <Icon size={11} className="flex-shrink-0" />
                          <span className="truncate">{e.subject}</span>
                          <span className="text-ink-faint no-underline">· {e.hours}h</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {days.length > 0 && (
          <div className="mt-4 border-t border-sand pt-4">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">After these days</p>
                <p className={`text-2xl font-display font-bold ${overallAfter !== null && overallAfter < ATTENDANCE_THRESHOLD ? 'text-danger' : 'text-ink'}`}>
                  {fmtPct(overallAfter)}
                  {overallNow !== null && overallAfter !== null && (
                    <span className={`text-xs font-bold ml-2 ${overallAfter >= overallNow ? 'text-sage-dark' : 'text-caution'}`}>
                      {overallAfter >= overallNow ? '+' : ''}{(overallAfter - overallNow).toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-[11px] text-ink-muted text-right">
                {after.skippedHours} hr{after.skippedHours === 1 ? '' : 's'} skipped
                {skipped.size > 0 && (
                  <button onClick={() => setSkipped(new Set())} className="ml-2 underline">Reset</button>
                )}
              </p>
            </div>

            {willDrop.length === 0 ? (
              <p className="text-[11px] font-bold text-sage-dark flex items-center gap-1 mb-3">
                <ShieldCheck size={13} /> Every subject stays at or above {ATTENDANCE_THRESHOLD}%.
              </p>
            ) : (
              <p className="text-[11px] font-bold text-danger flex items-start gap-1 mb-3">
                <ShieldAlert size={13} className="mt-px flex-shrink-0" />
                <span>Drops below {ATTENDANCE_THRESHOLD}%: {willDrop.join(', ')}</span>
              </p>
            )}

            <div className="space-y-1.5">
              {subjectNames.map(name => {
                const before = now.bySubject.get(name) || { attended: 0, marked: 0 };
                const t = after.subjects.get(name) || { attended: 0, marked: 0 };
                const b = pct(before.attended, before.marked);
                const a = pct(t.attended, t.marked);
                const low = a !== null && a < ATTENDANCE_THRESHOLD;
                return (
                  <div key={name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-ink">{name}</span>
                    <span className="flex-shrink-0 text-ink-muted">
                      {fmtPct(b)} → <strong className={low ? 'text-danger' : 'text-ink'}>{fmtPct(a)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

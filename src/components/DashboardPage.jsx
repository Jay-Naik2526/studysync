import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, ArrowUpRight, Link, Unlink, RefreshCw, Loader2, X, Clock, HelpCircle } from 'lucide-react';
import { dashboardAPI, sapAPI } from '../api';
import { ATTENDANCE_THRESHOLD } from '../constants';

import { COLORS, useTheme } from '../theme.jsx';
import WeeklyTrend from './WeeklyTrend';
import { ContourGauge, SyncDot } from './ContourGauge';
import { Radar, WantedStars, HudBar, Ticker, MissionBanner } from './NeonHud';
// Eases a number from its last value to the new one; instant when the user prefers reduced motion.
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const end = Number(target) || 0;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { from.current = end; setValue(end); return; }
    const start = from.current; const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const v = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      from.current = v; setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Ring({ pct, size = 110, stroke = 10, color }) {
  const r = size / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  const offset = circ - (Math.min(shown, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ minWidth: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: COLORS.track }} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        style={{ stroke: color, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

function GaugeCard({ label, pct, color }) {
  const count = useCountUp(pct);
  return (
    <div className="bg-parchment border border-sand rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm">
      <div className="relative">
        <Ring pct={pct} color={color} />
        <span className="absolute inset-0 flex items-center justify-center text-xl font-display font-semibold text-ink tabular-nums">{count}%</span>
      </div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
    </div>
  );
}

function StatCard({ label, value }) {
  const count = useCountUp(value);
  return (
    <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-3xl font-display font-semibold text-ink leading-none mt-3 tabular-nums">{count}</p>
    </div>
  );
}

function BarChart({ data, color, valueKey = 'value', nameKey = 'name', unitSuffix = '', emptyText = 'No data yet' }) {
  if (!data?.length || data.every(d => !d[valueKey])) return <div className="flex items-center justify-center h-full text-ink-muted text-xs">{emptyText}</div>;
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);
  return (
    <div className="flex items-end gap-2 h-full px-1 pt-2">
      {data.map((item, i) => {
        const pct = ((item[valueKey] ?? 0) / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end min-w-0">
            <span className="text-[11px] text-ink-muted truncate tabular-nums">
              {item[valueKey]}{unitSuffix}
            </span>
            <div className="bar-grow w-full max-w-[28px] mx-auto rounded-t-md"
              style={{ height: `${Math.max(pct, 4)}%`, background: color, animationDelay: `${i * 40}ms` }} />
            <span className="text-[11px] text-ink-faint truncate w-full text-center">
              {(item[nameKey] || '').substring(0, 5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Ledger: small, different-in-kind data views ──
function RegisterRow({ label, value, suffix = '', cash = false }) {
  const n = useCountUp(value);
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-t border-sand first:border-t-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={`${cash ? 'neon-cash text-2xl' : 'text-xl font-display font-semibold text-ink'} tabular-nums`}>{n}{suffix}</dd>
    </div>
  );
}

function RankedList({ title, note, items, leadIndex = -1, suffix = '', max = 100, emptyText, twoColumns = false }) {
  const empty = !items.length || items.every(i => !i.value);
  return (
    <div className="bg-parchment border border-sand rounded-2xl p-5">
      <p className="text-sm font-display font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-muted mb-3">{note}</p>
      {empty ? (
        <p className="text-xs text-ink-muted py-4">{emptyText}</p>
      ) : (
        <ul className={twoColumns ? 'grid sm:grid-cols-2 sm:gap-x-8' : ''}>
          {items.map((it, i) => (
            <li key={it.name + i} className="py-2.5 border-t border-sand first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-sm text-ink truncate">{it.name}</span>
                <span className="text-sm font-medium text-ink tabular-nums">{it.value}{suffix}</span>
              </div>
              <div className="h-1 rounded-full bg-ink/10 overflow-hidden" aria-hidden="true">
                <div className={`grow-x h-1 rounded-full ${i === leadIndex ? 'bg-ember' : 'bg-ink/30'}`} style={{ width: `${Math.min((it.value / max) * 100, 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Microsoft Calendar Link Help Modal ──
function MicrosoftHelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm anim-fade">
      <div className="anim-pop bg-parchment border border-sand rounded-2xl p-6 w-full max-w-md shadow-lg shadow-ink/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-display font-semibold text-ink flex items-center gap-2">
            <Clock size={16} className="text-ember-dark" /> How to find Calendar Feed URL
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4 text-xs text-ink-muted leading-relaxed">
          <p>Since your Teams assignment deadlines are hosted securely on your college Outlook account, follow these simple steps to sync them to StudySync in real-time:</p>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Open official <a href="https://outlook.office.com" target="_blank" rel="noreferrer" className="text-trail-dark underline">Outlook Web App</a> and log in with your college credentials.</li>
            <li>Click the <strong className="text-ink">Settings gear icon</strong> at the top right.</li>
            <li>Navigate to <strong className="text-ink">Calendar</strong> → <strong className="text-ink">Shared Calendars</strong>.</li>
            <li>Go to the <strong className="text-ink">Publish a Calendar</strong> section.</li>
            <li>Select <strong className="text-ink">Calendar</strong> and set permissions to <strong className="text-ink">Can view all details</strong>.</li>
            <li>Click <strong className="text-ink">Publish</strong>, copy the <strong className="text-ink">ICS link</strong> (starts with <code className="bg-map border border-sand rounded px-1">https://</code> or <code className="bg-map border border-sand rounded px-1">webcal://</code>) and paste it inside StudySync!</li>
          </ol>
          <div className="bg-sage-pale border border-sage/30 p-3 rounded-xl mt-2 text-sage-dark">
            <strong>Why ICS?</strong> Bypasses campus firewalls securely and keeps all Teams &amp; Outlook assignment deadlines auto-updating dynamically!
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connect Microsoft Calendar Modal ──
function CalendarModal({ onClose, onSaved }) {
  const [calUrl, setCalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await sapAPI.saveCalendarUrl({ calendarUrl: calUrl });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm anim-fade">
      <div className="anim-pop bg-parchment border border-sand rounded-2xl p-6 w-full max-w-sm shadow-lg shadow-ink/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-display font-semibold text-ink flex items-center gap-2">
              <Clock size={16} className="text-ember-dark" /> Connect Teams
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Sync upcoming assignment deadlines</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-medium text-ink-muted leading-none">Outlook ICS Calendar URL</label>
              <button type="button" onClick={() => setShowHelp(true)} className="text-[11px] font-medium text-ember-dark flex items-center gap-0.5 leading-none">
                <HelpCircle size={14} /> Find URL
              </button>
            </div>
            <input type="url" placeholder="Paste webcal:// or https:// ICS link..." value={calUrl} onChange={e => setCalUrl(e.target.value)}
              className="w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-3 text-xs focus:outline-none focus:border-ember" required />
          </div>
          {err && <p className="text-xs text-danger">{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-medium rounded-xl text-xs transition-colors shadow-sm">
            {saving ? 'Connecting…' : 'Connect Teams feed'}
          </button>
        </form>
      </div>
      {showHelp && <MicrosoftHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default function DashboardPage({ onNavigate }) {
  const { isStructured, isNeon } = useTheme();
  const [dayRecords, setDayRecords] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Microsoft Calendar State
  const [sapStatus, setSapStatus] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [syncingCal, setSyncingCal] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [calError, setCalError] = useState('');

  const fetchSapStatus = async () => {
    try {
      const resp = await sapAPI.getStatus();
      setSapStatus(resp.data);
      if (resp.data.microsoftCalendarUrl) {
        fetchDeadlines();
      }
    } catch (e) { console.error('Status fetch failed:', e); }
  };

  const fetchDeadlines = async () => {
    try {
      const resp = await sapAPI.getDeadlines();
      setDeadlines(resp.data);
    } catch (e) {
      console.warn('Deadlines retrieval failed:', e);
    }
  };

  const handleCalSync = async () => {
    setSyncingCal(true); setCalError('');
    try {
      await fetchDeadlines();
      await fetchSapStatus();
    } catch (e) {
      setCalError('Deadlines sync failed. Please check feed URL.');
    } finally { setSyncingCal(false); }
  };

  const handleCalDisconnect = async () => {
    if (!window.confirm('Disconnect Microsoft Teams feed?')) return;
    try {
      // Disconnect by clearing url parameter inside Mongoose
      await sapAPI.saveCalendarUrl({ calendarUrl: '' });
      setDeadlines([]);
      fetchSapStatus();
    } catch {}
  };

  // Ledger shows a weekly trend as its main chart, which needs the day-by-day records
  useEffect(() => {
    if (!isStructured) return;
    sapAPI.getAttendanceDays().then(r => setDayRecords(r.data.records || [])).catch(() => {});
  }, [isStructured]);

  useEffect(() => {
    dashboardAPI.getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchSapStatus();
  }, []);

  const attCount = useCountUp(data?.stats?.attendance ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-ember/25 border-t-ember animate-spin" />
          <p className="text-ink-muted text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-[60vh] text-ink-muted text-sm px-4 text-center">Failed to load. Please sign out and back in.</div>;
  }

  const { stats, charts, lowAttendanceSubjects } = data;
  const skippableData = (charts.skippableClassesData || []).map(d => ({ value: d.remaining, name: d.name }));
  const marksData = (charts.marksBySubject || []).map(d => ({ value: Math.round(d.percentage), name: d.subject }));

  if (isStructured) {
    const skipMax = Math.max(...skippableData.map(d => d.value), 1);
    const skipLead = skippableData.length ? skippableData.reduce((m, d, i, arr) => (d.value < arr[m].value ? i : m), 0) : -1;
    const marksLead = marksData.length ? marksData.reduce((m, d, i, arr) => (d.value > arr[m].value ? i : m), 0) : -1;
    const lastSync = sapStatus?.lastSync ? new Date(sapStatus.lastSync) : null;
    const low = lowAttendanceSubjects || [];
    const wanted = Math.min(5, low.length);
    const radarBlips = (charts.skippableClassesData || []).map(d => ({ name: d.name, pct: low.find(l => l.name === d.name)?.percentage ?? 90 }));
    const bestSkip = skippableData.length ? skippableData.reduce((m, d) => (d.value > m.value ? d : m), skippableData[0]) : null;
    const tickerItems = [
      `Attendance holding at ${stats.attendance}% across ${stats.subjects} subjects`,
      low.length ? `Wanted level ${wanted}: ${low.map(l => l.name).join(', ')} below ${ATTENDANCE_THRESHOLD}%` : `Zero stars: every subject is above ${ATTENDANCE_THRESHOLD}%`,
      `${stats.daysPresent} days present and ${stats.absences} absences on record`,
      bestSkip && bestSkip.value > 0 ? `Most to spare: ${bestSkip.name} with ${bestSkip.value} skippable classes` : null,
      `Average marks at ${Math.round(stats.averageMarks)}%`,
    ].filter(Boolean);
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-medium text-ink-muted mb-1">Base camp</p>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink tracking-tight">Dashboard</h1>
          </div>
          {lastSync && (
            <p className="flex items-center gap-2 text-xs text-ink-muted pb-2">
              <SyncDot state="ok" label="Up to date" />
              Synced {lastSync.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {isNeon && <div className="mb-4"><Ticker items={tickerItems} /></div>}

        {/* The moment: attendance as a contour map (Neon Coast: a radar with health and armor), beside the register of figures */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {isNeon ? (
            <div className="lg:col-span-2 bg-parchment border border-sand rounded-2xl p-5 flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm font-display text-ink">Radar</p>
                <div className="flex items-center gap-2"><span className="text-[11px] uppercase tracking-wider text-ink-muted">Wanted</span><WantedStars level={wanted} /></div>
              </div>
              <Radar size={216} blips={radarBlips} />
              <div className="w-full space-y-3">
                <HudBar label="Health · Attendance" value={stats.attendance} color="#22D3C5" />
                <HudBar label="Armor · Average marks" value={stats.averageMarks} color="#7C8CFF" />
              </div>
            </div>
          ) : (
          <div className="lg:col-span-2 bg-parchment border border-sand rounded-2xl p-5 flex flex-col items-center justify-center">
            <ContourGauge pct={stats.attendance}>
              <div className="text-center">
                <p className="text-4xl font-display font-semibold text-ink tabular-nums leading-none"><span className="hl">{attCount}%</span></p>
                <p className="text-xs text-ink-muted mt-2">Attendance</p>
              </div>
            </ContourGauge>
            <p className="text-xs text-ink-muted mt-2">{ATTENDANCE_THRESHOLD}% required</p>
          </div>
          )}
          <div className="lg:col-span-3 bg-parchment border border-sand rounded-2xl p-5">
            <p className="text-sm font-display font-semibold text-ink mb-1">Register</p>
            <dl>
              <RegisterRow label="Days present" value={stats.daysPresent} />
              <RegisterRow label="Absences" value={stats.absences} />
              <RegisterRow label="Subjects" value={stats.subjects} />
              <RegisterRow label="Average marks" value={Math.round(stats.averageMarks)} suffix="%" />
              <RegisterRow label="Total marks" value={stats.totalMarks} cash={isNeon} />
            </dl>
          </div>
        </div>

      {/* Microsoft Teams Deadlines Strip */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sapStatus?.microsoftCalendarUrl ? 'bg-sage-pale' : 'bg-map'}`}>
              <Clock size={16} className={sapStatus?.microsoftCalendarUrl ? 'text-sage-dark' : 'text-ink-faint'} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink flex items-center gap-2">
                Microsoft Teams integration
                {sapStatus?.microsoftCalendarUrl && <span className="text-[11px] font-medium text-sage-dark bg-sage-pale px-2 py-0.5 rounded-full">Connected</span>}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                {sapStatus?.microsoftCalendarUrl
                  ? sapStatus.lastCalendarSync
                    ? `Tracking ${deadlines.length} ${deadlines.length === 1 ? 'deadline' : 'deadlines'}`
                    : 'Feed linked, syncing deadlines…'
                  : 'Sync assignment deadlines from Teams and Outlook'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {sapStatus?.microsoftCalendarUrl ? (
              <>
                <button
                  onClick={handleCalSync} disabled={syncingCal}
                  className="flex items-center gap-2 px-4 py-2 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors shadow-sm">
                  {syncingCal ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {syncingCal ? 'Syncing…' : 'Sync'}
                </button>
                <button onClick={handleCalDisconnect} className="px-3 py-2 bg-white hover:bg-danger-pale border border-sand hover:border-danger/30 rounded-xl transition-colors group">
                  <Unlink size={16} className="text-ink-muted group-hover:text-danger" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowCalModal(true)}
                className="flex items-center gap-2 px-4 py-3 sm:py-2 bg-ember hover:bg-ember-dark text-white rounded-xl text-xs font-medium transition-colors shadow-sm">
                <Link size={16} /> Link Teams
              </button>
            )}
          </div>
        </div>

        {/* Deadlines Checklist Box */}
        {sapStatus?.microsoftCalendarUrl && deadlines.length > 0 && (
          <div className="mt-4 border-t border-sand pt-4">
            <h4 className="text-[11px] font-medium text-ink-muted mb-3">Upcoming assignment deadlines</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {deadlines.map((dl, idx) => {
                const hoursLeft = Math.round(dl.remainingMs / (1000 * 60 * 60));
                const daysLeft = Math.round(hoursLeft / 24);
                const isOverdue = dl.remainingMs < 0;

                let colorClass = 'border-sage/30 bg-sage-pale text-sage-dark';
                let timeText = `${daysLeft} days left`;

                if (isOverdue) {
                  colorClass = 'border-sand bg-map text-ink-faint';
                  timeText = 'Overdue';
                } else if (hoursLeft <= 24) {
                  colorClass = 'border-danger/30 bg-danger-pale text-danger';
                  timeText = `${hoursLeft} hours left`;
                } else if (daysLeft <= 3) {
                  colorClass = 'border-caution/30 bg-caution-pale text-caution';
                  timeText = `${daysLeft} days left`;
                }

                return (
                  <div key={idx} className="flex items-center justify-between gap-3 border border-sand bg-white/50 rounded-xl p-3 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate max-w-[200px]">{dl.title}</p>
                      <p className="text-[11px] text-ink-muted mt-0.5">{new Date(dl.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-full px-3 py-0.5 ${colorClass}`}>
                      {timeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

        {isNeon && wanted === 0 && (
          <div className="bg-parchment border border-sand rounded-2xl mb-4">
            <MissionBanner kind="passed" sub={`All subjects above ${ATTENDANCE_THRESHOLD}%`} />
          </div>
        )}

        {/* Main chart + a smaller list of a different kind */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2 bg-parchment border border-sand rounded-2xl p-5">
            <p className="text-sm font-display font-semibold text-ink">Attendance by week</p>
            <p className="text-xs text-ink-muted mb-3">Running total against the {ATTENDANCE_THRESHOLD}% requirement</p>
            <WeeklyTrend records={dayRecords} />
          </div>
          <RankedList
            title="Skippable classes" note="Remaining per subject"
            items={skippableData} leadIndex={skipLead} max={skipMax}
            emptyText="No data yet"
          />
        </div>

        <div className="mb-4">
          <RankedList
            title="Marks by subject" note="Score percentage"
            items={marksData} leadIndex={marksLead} suffix="%" twoColumns
            emptyText="No marks recorded yet"
          />
        </div>

      {/* Row 3: Alerts + Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Alerts */}
        <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-display font-semibold text-ink mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-caution" />Attendance alerts
          </p>
          <div className="space-y-3">
            {lowAttendanceSubjects?.length > 0 ? (
              lowAttendanceSubjects.map((s, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink truncate">{s.name}</span>
                    <span className="text-xs font-medium text-danger flex-shrink-0 tabular-nums">{s.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-ink/10 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-danger transition-[width]" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <p className="text-[11px] text-ink-faint">{s.remainingSkippable} skips left</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sage-dark">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">All subjects above {ATTENDANCE_THRESHOLD}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick links 2×2 grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Attendance', view: 'attendance', sub: 'Track classes' },
            { label: 'Marks', view: 'marks', sub: 'Grades and tasks' },
            { label: 'Subjects', view: 'subjects', sub: 'Manage subjects' },
            { label: 'Notes', view: 'notes', sub: 'Generate notes' },
          ].map(({ label, view, sub }) => (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className="lift bg-parchment border border-sand rounded-2xl p-4 text-left hover:border-sand-dark group shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-display font-semibold text-ink leading-tight">{label}</p>
                <ArrowUpRight size={16} className="text-ink-faint group-hover:text-ink-muted transition-colors" />
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-tight">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {showCalModal && (
        <CalendarModal
          onClose={() => setShowCalModal(false)}
          onSaved={() => { setShowCalModal(false); fetchSapStatus(); }}
        />
      )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-7">
        <p className="text-xs font-medium text-ink-muted mb-1">Base camp</p>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink tracking-tight">Dashboard</h1>
      </div>

      {/* Row 1: two gauges on the left, four figures on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <GaugeCard label="Attendance" pct={stats.attendance} color={COLORS.sage} />
          <GaugeCard label="Average marks" pct={stats.averageMarks} color={COLORS.trail} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Days present" value={stats.daysPresent} />
          <StatCard label="Absences" value={stats.absences} />
          <StatCard label="Subjects" value={stats.subjects} />
          <StatCard label="Total marks" value={stats.totalMarks} />
        </div>
      </div>

      {/* Microsoft Teams Deadlines Strip */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sapStatus?.microsoftCalendarUrl ? 'bg-sage-pale' : 'bg-map'}`}>
              <Clock size={16} className={sapStatus?.microsoftCalendarUrl ? 'text-sage-dark' : 'text-ink-faint'} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink flex items-center gap-2">
                Microsoft Teams integration
                {sapStatus?.microsoftCalendarUrl && <span className="text-[11px] font-medium text-sage-dark bg-sage-pale px-2 py-0.5 rounded-full">Connected</span>}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                {sapStatus?.microsoftCalendarUrl
                  ? sapStatus.lastCalendarSync
                    ? `Tracking ${deadlines.length} ${deadlines.length === 1 ? 'deadline' : 'deadlines'}`
                    : 'Feed linked, syncing deadlines…'
                  : 'Sync assignment deadlines from Teams and Outlook'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {sapStatus?.microsoftCalendarUrl ? (
              <>
                <button
                  onClick={handleCalSync} disabled={syncingCal}
                  className="flex items-center gap-2 px-4 py-2 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors shadow-sm">
                  {syncingCal ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {syncingCal ? 'Syncing…' : 'Sync'}
                </button>
                <button onClick={handleCalDisconnect} className="px-3 py-2 bg-white hover:bg-danger-pale border border-sand hover:border-danger/30 rounded-xl transition-colors group">
                  <Unlink size={16} className="text-ink-muted group-hover:text-danger" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowCalModal(true)}
                className="flex items-center gap-2 px-4 py-3 sm:py-2 bg-ember hover:bg-ember-dark text-white rounded-xl text-xs font-medium transition-colors shadow-sm">
                <Link size={16} /> Link Teams
              </button>
            )}
          </div>
        </div>

        {/* Deadlines Checklist Box */}
        {sapStatus?.microsoftCalendarUrl && deadlines.length > 0 && (
          <div className="mt-4 border-t border-sand pt-4">
            <h4 className="text-[11px] font-medium text-ink-muted mb-3">Upcoming assignment deadlines</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {deadlines.map((dl, idx) => {
                const hoursLeft = Math.round(dl.remainingMs / (1000 * 60 * 60));
                const daysLeft = Math.round(hoursLeft / 24);
                const isOverdue = dl.remainingMs < 0;

                let colorClass = 'border-sage/30 bg-sage-pale text-sage-dark';
                let timeText = `${daysLeft} days left`;

                if (isOverdue) {
                  colorClass = 'border-sand bg-map text-ink-faint';
                  timeText = 'Overdue';
                } else if (hoursLeft <= 24) {
                  colorClass = 'border-danger/30 bg-danger-pale text-danger';
                  timeText = `${hoursLeft} hours left`;
                } else if (daysLeft <= 3) {
                  colorClass = 'border-caution/30 bg-caution-pale text-caution';
                  timeText = `${daysLeft} days left`;
                }

                return (
                  <div key={idx} className="flex items-center justify-between gap-3 border border-sand bg-white/50 rounded-xl p-3 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate max-w-[200px]">{dl.title}</p>
                      <p className="text-[11px] text-ink-muted mt-0.5">{new Date(dl.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-full px-3 py-0.5 ${colorClass}`}>
                      {timeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Two charts side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-display font-semibold text-ink mb-0.5">Skippable classes</p>
          <p className="text-[11px] text-ink-muted mb-3">Remaining per subject</p>
          <div className="h-28">
            <BarChart data={skippableData} color={COLORS.sage} valueKey="value" nameKey="name" />
          </div>
        </div>
        <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-display font-semibold text-ink mb-0.5">Marks by subject</p>
          <p className="text-[11px] text-ink-muted mb-3">Score percentage</p>
          <div className="h-28">
            <BarChart data={marksData} color={COLORS.trail} valueKey="value" nameKey="name" unitSuffix="%" emptyText="No marks recorded yet" />
          </div>
        </div>
      </div>

      {/* Row 3: Alerts + Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Alerts */}
        <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-display font-semibold text-ink mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-caution" />Attendance alerts
          </p>
          <div className="space-y-3">
            {lowAttendanceSubjects?.length > 0 ? (
              lowAttendanceSubjects.map((s, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink truncate">{s.name}</span>
                    <span className="text-xs font-medium text-danger flex-shrink-0 tabular-nums">{s.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-ink/10 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-danger transition-[width]" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <p className="text-[11px] text-ink-faint">{s.remainingSkippable} skips left</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sage-dark">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">All subjects above {ATTENDANCE_THRESHOLD}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick links 2×2 grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Attendance', view: 'attendance', sub: 'Track classes' },
            { label: 'Marks', view: 'marks', sub: 'Grades and tasks' },
            { label: 'Subjects', view: 'subjects', sub: 'Manage subjects' },
            { label: 'Notes', view: 'notes', sub: 'Generate notes' },
          ].map(({ label, view, sub }) => (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className="bg-parchment border border-sand rounded-2xl p-4 text-left hover:border-sand-dark hover:bg-white/60 transition-colors group shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-display font-semibold text-ink leading-tight">{label}</p>
                <ArrowUpRight size={16} className="text-ink-faint group-hover:text-ink-muted transition-colors" />
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-tight">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {showCalModal && (
        <CalendarModal
          onClose={() => setShowCalModal(false)}
          onSaved={() => { setShowCalModal(false); fetchSapStatus(); }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarCheck, CalendarX, BookOpen, AlertTriangle, CheckCircle, ArrowUpRight, Microsoft, Link, Unlink, RefreshCw, Loader2, X, Clock, HelpCircle } from 'lucide-react';
import { dashboardAPI, sapAPI } from '../api';

function Ring({ pct, size = 110, stroke = 10, color }) {
  const r = size / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ minWidth: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

function GaugeCard({ label, pct, color, glow }) {
  return (
    <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-white/[0.14] transition-all overflow-hidden group">
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(ellipse at center, ${glow} 0%, transparent 70%)` }} />
      <div className="relative">
        <Ring pct={pct} color={color} />
        <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">{pct}%</span>
      </div>
      <p className="text-xs font-medium text-zinc-400 relative">{label}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3 hover:border-white/[0.14] transition-all">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide leading-none">{label}</p>
        <p className="text-xl font-black text-white leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function BarChart({ data, color, valueKey = 'value', nameKey = 'name', unitSuffix = '' }) {
  if (!data?.length) return <div className="flex items-center justify-center h-full text-zinc-700 text-xs">No data yet</div>;
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1);
  return (
    <div className="flex items-end gap-1.5 h-full px-1 pt-2">
      {data.map((item, i) => {
        const pct = ((item[valueKey] ?? 0) / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group min-w-0">
            <span className="text-[9px] text-zinc-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity truncate">
              {item[valueKey]}{unitSuffix}
            </span>
            <div className="w-full max-w-[28px] mx-auto rounded-t-md transition-all duration-700"
              style={{ height: `${Math.max(pct, 4)}%`, background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)` }} />
            <span className="text-[9px] text-zinc-700 truncate w-full text-center">
              {(item[nameKey] || '').substring(0, 5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Microsoft Calendar Link Help Modal ──
function MicrosoftHelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0c17] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-fuchsia-400" /> How to find Calendar Feed URL
          </h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
          <p>Since your Teams assignment deadlines are hosted securely on your college Outlook account, follow these simple steps to sync them to StudySync in real-time:</p>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Open official <a href="https://outlook.office.com" target="_blank" rel="noreferrer" className="text-violet-400 underline">Outlook Web Web-App</a> and log in with your college credentials.</li>
            <li>Click the ⚙️ **Settings Gear Icon** at the top right.</li>
            <li>Navigate to **Calendar** ➡️ **Shared Calendars**.</li>
            <li>Go to the **Publish a Calendar** section.</li>
            <li>Select **Calendar** and set permissions to **Can view all details**.</li>
            <li>Click **Publish**, copy the **ICS link** (starts with `https://` or `webcal://`) and paste it inside StudySync!</li>
          </ol>
          <div className="bg-violet-500/10 border border-violet-500/20 p-3 rounded-xl mt-2 text-violet-300">
            💡 <strong>Why ICS?</strong> Bypasses campus firewalls securely and keeps all Teams & Outlook assignment deadlines auto-updating dynamically!
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0c17] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Clock size={16} className="text-fuchsia-400" /> Connect Teams
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Sync upcoming assignment deadlines.</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Outlook ICS Calendar URL</label>
              <button type="button" onClick={() => setShowHelp(true)} className="text-[10px] font-bold text-violet-400 flex items-center gap-0.5 leading-none">
                <HelpCircle size={10} /> Find URL
              </button>
            </div>
            <input type="url" placeholder="Paste webcal:// or https:// ICS link..." value={calUrl} onChange={e => setCalUrl(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500/50" required />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-violet-500/20">
            {saving ? 'Connecting…' : 'Connect Teams Feed'}
          </button>
        </form>
      </div>
      {showHelp && <MicrosoftHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default function DashboardPage({ onNavigate }) {
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

  useEffect(() => {
    dashboardAPI.getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchSapStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-[60vh] text-zinc-500 text-sm px-4 text-center">Failed to load. Please sign out and back in.</div>;
  }

  const { stats, charts, lowAttendanceSubjects } = data;
  const skippableData = (charts.skippableClassesData || []).map(d => ({ value: d.remaining, name: d.name }));
  const marksData = (charts.marksBySubject || []).map(d => ({ value: Math.round(d.percentage), name: d.subject }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Header */}
      <div className="mb-7">
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Overview</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Dashboard</h1>
      </div>

      {/* Row 1: Gauges + 4 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {/* Gauges span 2 cols on all sizes */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <GaugeCard label="Attendance" pct={stats.attendance} color="#a78bfa" glow="rgba(167,139,250,0.08)" />
          <GaugeCard label="Avg. Marks" pct={stats.averageMarks} color="#f0abfc" glow="rgba(240,171,252,0.08)" />
        </div>
        {/* Stat cards: 2×2 on mobile, each 1 col on sm+ */}
        <StatCard icon={CalendarCheck} label="Present" value={stats.daysPresent} accent="#34d399" />
        <StatCard icon={CalendarX} label="Absences" value={stats.absences} accent="#f87171" />
        <StatCard icon={BookOpen} label="Subjects" value={stats.subjects} accent="#a78bfa" />
        <StatCard icon={TrendingUp} label="Total Marks" value={stats.totalMarks} accent="#fbbf24" />
      </div>

      {/* Microsoft Teams Deadlines Alert Strip */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sapStatus?.microsoftCalendarUrl ? 'bg-fuchsia-500/15' : 'bg-zinc-800'}`}>
              <Clock size={15} className={sapStatus?.microsoftCalendarUrl ? 'text-fuchsia-400' : 'text-zinc-600'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                Microsoft Teams Integration
                {sapStatus?.microsoftCalendarUrl && <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-full">Connected</span>}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {sapStatus?.microsoftCalendarUrl 
                  ? sapStatus.lastCalendarSync
                    ? `Synced successfully. Tracking ${deadlines.length} active deadline(s).`
                    : 'Feed linked — Syncing assignment deadlines...'
                  : 'Sync your university Teams & Outlook assignment deadlines in real-time.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {sapStatus?.microsoftCalendarUrl ? (
              <>
                <button
                  onClick={handleCalSync} disabled={syncingCal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all">
                  {syncingCal ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {syncingCal ? 'Syncing…' : 'Sync'}
                </button>
                <button onClick={handleCalDisconnect} className="px-3 py-2 bg-white/[0.05] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 rounded-xl transition-all">
                  <Unlink size={13} className="text-zinc-500 hover:text-red-400" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowCalModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-semibold transition-all">
                <Link size={13} /> Link Teams
              </button>
            )}
          </div>
        </div>
        
        {/* Deadlines Checklist Box */}
        {sapStatus?.microsoftCalendarUrl && deadlines.length > 0 && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Upcoming Assignment Deadlines</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {deadlines.map((dl, idx) => {
                const hoursLeft = Math.round(dl.remainingMs / (1000 * 60 * 60));
                const daysLeft = Math.round(hoursLeft / 24);
                const isOverdue = dl.remainingMs < 0;
                
                let colorClass = 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400';
                let timeText = `${daysLeft} days left`;
                
                if (isOverdue) {
                  colorClass = 'border-zinc-500/20 bg-white/[0.02] text-zinc-500';
                  timeText = 'Overdue';
                } else if (hoursLeft <= 24) {
                  colorClass = 'border-red-500/25 bg-red-500/5 text-red-400 animate-pulse';
                  timeText = `${hoursLeft} hours left!`;
                } else if (daysLeft <= 3) {
                  colorClass = 'border-amber-500/25 bg-amber-500/5 text-amber-400';
                  timeText = `${daysLeft} days left`;
                }

                return (
                  <div key={idx} className={`flex items-center justify-between gap-3 border rounded-xl p-3 hover:border-white/[0.1] transition-all`}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[200px]">{dl.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(dl.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${colorClass}`}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.13] transition-all">
          <p className="text-sm font-bold text-white mb-0.5">Skippable Classes</p>
          <p className="text-[10px] text-zinc-600 mb-3">Remaining per subject</p>
          <div className="h-28">
            <BarChart data={skippableData} color="#34d399" valueKey="value" nameKey="name" />
          </div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.13] transition-all">
          <p className="text-sm font-bold text-white mb-0.5">Marks by Subject</p>
          <p className="text-[10px] text-zinc-600 mb-3">Score percentage</p>
          <div className="h-28">
            <BarChart data={marksData} color="#a78bfa" valueKey="value" nameKey="name" unitSuffix="%" />
          </div>
        </div>
      </div>

      {/* Row 3: Alerts + Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Alerts */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.13] transition-all">
          <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />Attendance Alerts
          </p>
          <div className="space-y-3">
            {lowAttendanceSubjects?.length > 0 ? (
              lowAttendanceSubjects.map((s, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-200 truncate">{s.name}</span>
                    <span className="text-xs font-bold text-red-400 flex-shrink-0">{s.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-700">{s.remainingSkippable} skips left</p>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={15} />
                <span className="text-sm font-medium">All subjects above 80%</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick links 2×2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Attendance', view: 'attendance', color: '#34d399', sub: 'Track classes' },
            { label: 'Marks', view: 'marks', color: '#a78bfa', sub: 'Grades & tasks' },
            { label: 'Subjects', view: 'subjects', color: '#60a5fa', sub: 'Manage subjects' },
            { label: 'AI Notes', view: 'notes', color: '#f0abfc', sub: 'Generate notes' },
          ].map(({ label, view, color, sub }) => (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-left hover:border-white/[0.15] hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <ArrowUpRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </div>
              <p className="text-sm font-bold text-white leading-tight">{label}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{sub}</p>
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

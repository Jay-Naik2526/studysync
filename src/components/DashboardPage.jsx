import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarCheck, CalendarX, BookOpen, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { dashboardAPI } from '../api';

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

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
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
    </div>
  );
}

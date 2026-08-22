import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Search, AlertTriangle, Loader2, ChevronRight,
  GraduationCap, Clock, Inbox
} from 'lucide-react';
import { mentorAPI } from '../api';

function MenteeRow({ mentee, onClick }) {
  const pct = mentee.attendance?.percentage;
  const atRisk = mentee.attendance?.atRisk;

  return (
    <button
      onClick={onClick}
      className="w-full bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm text-left hover:border-sand-dark hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          atRisk ? 'bg-danger-pale text-danger' : 'bg-sage-pale text-sage-dark'
        }`}>
          {(mentee.name || '?')[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-ink truncate">{mentee.name}</p>
            {atRisk && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-danger bg-danger-pale px-1.5 py-0.5 rounded-full flex-shrink-0">
                <AlertTriangle size={9} /> At Risk
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            {mentee.rollNo && (
              <span className="text-[11px] text-ink-muted">{mentee.rollNo}</span>
            )}
            {mentee.division && (
              <span className="text-[11px] text-ink-faint">Div {mentee.division}</span>
            )}
            {mentee.program && (
              <span className="text-[11px] text-ink-faint">{mentee.program}</span>
            )}
          </div>
        </div>

        {/* Attendance */}
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-display font-bold ${
            pct === null ? 'text-ink-faint' :
            atRisk ? 'text-danger' :
            pct < 80 ? 'text-caution' : 'text-sage-dark'
          }`}>
            {pct !== null && pct !== undefined ? `${Math.round(pct)}%` : '—'}
          </p>
          <p className="text-[10px] text-ink-muted">attendance</p>
        </div>

        {/* Pending badge + chevron */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {mentee.pendingApplications > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-caution bg-caution-pale px-1.5 py-0.5 rounded-full">
              <Inbox size={9} /> {mentee.pendingApplications}
            </span>
          )}
          <ChevronRight size={14} className="text-ink-faint group-hover:text-ink transition-colors" />
        </div>
      </div>

      {/* Last sync */}
      {mentee.lastSync && (
        <p className="text-[10px] text-ink-faint mt-2 flex items-center gap-1">
          <Clock size={9} />
          Last sync: {new Date(mentee.lastSync).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </button>
  );
}

export default function MenteesPage({ onNavigate, onSelectMentee }) {
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchMentees = useCallback(async () => {
    try {
      const res = await mentorAPI.getMentees();
      setMentees(res.data);
      setError('');
    } catch {
      setError('Could not load mentees.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMentees(); }, [fetchMentees]);

  const filtered = useMemo(() => {
    if (!search.trim()) return mentees;
    const q = search.toLowerCase();
    return mentees.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.rollNo?.toLowerCase().includes(q) ||
      m.division?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  }, [mentees, search]);

  // Sort: at-risk first, then by name
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.attendance?.atRisk && !b.attendance?.atRisk) return -1;
      if (!a.attendance?.atRisk && b.attendance?.atRisk) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [filtered]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading mentees…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      {/* Page header */}
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Students</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <Users size={22} className="text-ink-muted" /> Mentees
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          {mentees.length} student{mentees.length !== 1 ? 's' : ''} assigned to you.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchMentees} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* Search */}
      {mentees.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no, division…"
            className="w-full pl-10 pr-4 py-2.5 bg-parchment border border-sand rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ember transition-all"
          />
        </div>
      )}

      {/* Mentee list */}
      {mentees.length === 0 ? (
        <div className="bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <GraduationCap size={24} className="mx-auto text-ink-faint mb-2" />
          <p className="text-sm font-bold text-ink mb-1">No mentees yet</p>
          <p className="text-sm text-ink-muted">Students who join using your mentor code will appear here.</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm text-ink-muted">No students match "{search}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(mentee => (
            <MenteeRow
              key={mentee._id}
              mentee={mentee}
              onClick={() => onSelectMentee(mentee._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

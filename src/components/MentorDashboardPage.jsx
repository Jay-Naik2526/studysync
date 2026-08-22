import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, AlertTriangle, Inbox, Copy, Check,
  Loader2, RefreshCw, ArrowRight, Shield
} from 'lucide-react';
import { mentorAPI, profileAPI } from '../api';

function StatTile({ label, value, icon: Icon, color, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm text-left transition-all ${
        onClick ? 'hover:border-sand-dark hover:shadow-md cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl sm:text-3xl font-display font-bold text-ink`}>{value ?? '—'}</p>
      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mt-1">{label}</p>
      {onClick && (
        <p className="text-[11px] text-ember-dark font-bold mt-2 flex items-center gap-1">
          View all <ArrowRight size={11} />
        </p>
      )}
    </Wrapper>
  );
}

function MentorCodeCard({ code, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback noop */ }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-display font-bold text-ink flex items-center gap-2">
            <Shield size={14} className="text-ink-muted" /> Your Mentor Code
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">Share with students so they can join you.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-map rounded-xl px-4 py-3 border border-sand">
        <span className="text-xl sm:text-2xl font-display font-bold text-ink tracking-widest flex-1 select-all">
          {code || '—'}
        </span>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 text-xs font-bold text-trail-dark hover:text-trail bg-trail-pale hover:bg-trail/20 px-3 py-2 rounded-lg transition-all"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-ink-muted hover:text-ink transition-all"
      >
        <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
        {regenerating ? 'Regenerating…' : 'Generate new code'}
      </button>
    </div>
  );
}

export default function MentorDashboardPage({ onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const res = await mentorAPI.getOverview();
      setOverview(res.data);
      setError('');
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const handleRegenerate = async () => {
    try {
      const res = await profileAPI.regenerateCode();
      setOverview(prev => ({ ...prev, mentorCode: res.data.mentorCode }));
    } catch {
      setError('Could not regenerate code.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading dashboard…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      {/* Page header */}
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Overview</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <LayoutDashboard size={22} className="text-ink-muted" /> Mentor Dashboard
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          Your mentee overview at a glance.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchOverview} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatTile
          label="Mentees"
          value={overview?.menteeCount ?? 0}
          icon={Users}
          color="bg-trail"
          onClick={() => onNavigate('mentees')}
        />
        <StatTile
          label="At Risk"
          value={overview?.atRiskCount ?? 0}
          icon={AlertTriangle}
          color={overview?.atRiskCount > 0 ? 'bg-danger' : 'bg-sage'}
          onClick={() => onNavigate('mentees')}
        />
        <StatTile
          label="Pending"
          value={overview?.pendingApplicationCount ?? 0}
          icon={Inbox}
          color={overview?.pendingApplicationCount > 0 ? 'bg-caution' : 'bg-sage'}
          onClick={() => onNavigate('mentor-applications')}
        />
      </div>

      {/* Mentor code */}
      <MentorCodeCard code={overview?.mentorCode} onRegenerate={handleRegenerate} />

      {/* Empty state */}
      {overview?.menteeCount === 0 && (
        <div className="mt-5 bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-ink mb-1">No mentees yet</p>
          <p className="text-sm text-ink-muted">
            Share your mentor code with students. Once they join, their attendance and academic data will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

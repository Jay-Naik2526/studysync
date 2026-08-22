import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCircle, Save, Loader2, AlertTriangle, CheckCircle, Link2, Unlink,
  Copy, Check, RefreshCw, Building2, BadgeCheck, GraduationCap, Hash,
  LayoutGrid, BookOpen, Shield
} from 'lucide-react';
import { profileAPI } from '../api';

function Field({ label, icon: Icon, value, onChange, placeholder, disabled }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">
        <Icon size={11} /> {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2.5 bg-white border border-sand rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ember transition-all disabled:opacity-50 disabled:bg-map"
      />
    </label>
  );
}

// ─── Student Profile ────────────────────────────────────────
function StudentProfile({ profile, onUpdate }) {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [division, setDivision] = useState('');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setRollNo(profile.rollNo || '');
      setDivision(profile.division || '');
      setProgram(profile.program || '');
      setSemester(profile.semester || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await profileAPI.update({ name, rollNo, division, program, semester });
      onUpdate(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error handled at parent level
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <h2 className="text-sm font-display font-bold text-ink mb-4 flex items-center gap-2">
        <GraduationCap size={15} className="text-ink-muted" /> Academic Profile
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Field label="Name" icon={UserCircle} value={name} onChange={setName} placeholder="Your full name" />
        </div>
        <Field label="Roll No" icon={Hash} value={rollNo} onChange={setRollNo} placeholder="e.g. A064" />
        <Field label="Division" icon={LayoutGrid} value={division} onChange={setDivision} placeholder="e.g. 3A" />
        <Field label="Program" icon={BookOpen} value={program} onChange={setProgram} placeholder="e.g. B.Tech CSE" />
        <Field label="Semester" icon={BookOpen} value={semester} onChange={setSemester} placeholder="e.g. VI" />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex items-center gap-2 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
      </button>
    </div>
  );
}

// ─── Mentor Profile ─────────────────────────────────────────
function MentorProfile({ profile, onUpdate }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDepartment(profile.department || '');
      setEmployeeId(profile.employeeId || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await profileAPI.update({ name, department, employeeId });
      onUpdate(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error handled at parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <h2 className="text-sm font-display font-bold text-ink mb-4 flex items-center gap-2">
        <Shield size={15} className="text-ink-muted" /> Faculty Profile
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Field label="Name" icon={UserCircle} value={name} onChange={setName} placeholder="Your full name" />
        </div>
        <Field label="Department" icon={Building2} value={department} onChange={setDepartment} placeholder="e.g. Computer Science" />
        <Field label="Employee ID" icon={BadgeCheck} value={employeeId} onChange={setEmployeeId} placeholder="e.g. EMP-1234" />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex items-center gap-2 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
      </button>
    </div>
  );
}

// ─── Mentor Code Card (for mentors) ─────────────────────────
function MentorCodeCard({ code, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
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
      <h2 className="text-sm font-display font-bold text-ink mb-1 flex items-center gap-2">
        <Link2 size={15} className="text-ink-muted" /> Your Mentor Code
      </h2>
      <p className="text-xs text-ink-muted mb-4">Share this code with students so they can join you.</p>

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
        className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition-all"
      >
        <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
        {regenerating ? 'Regenerating…' : 'Generate a new code'}
      </button>
      <p className="text-[10px] text-ink-faint mt-1">
        Regenerating a code invalidates the old one. Students already linked to you are not affected.
      </p>
    </div>
  );
}

// ─── Join Mentor Card (for students) ────────────────────────
function JoinMentorCard({ profile, onRefresh }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const hasMentor = profile?.mentor && profile.mentor._id;

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true); setError(''); setSuccess('');
    try {
      const res = await profileAPI.joinMentor(code.trim());
      setSuccess(`Joined ${res.data.mentor.name}!`);
      setCode('');
      onRefresh();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join mentor.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true); setError('');
    try {
      await profileAPI.leaveMentor();
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave mentor.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <h2 className="text-sm font-display font-bold text-ink mb-1 flex items-center gap-2">
        <Link2 size={15} className="text-ink-muted" /> Your Mentor
      </h2>

      {hasMentor ? (
        <div className="mt-3">
          <div className="flex items-center gap-3 bg-sage-pale rounded-xl px-4 py-3 border border-sage/30">
            <div className="w-9 h-9 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0">
              <UserCircle size={18} className="text-sage-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate">{profile.mentor.name}</p>
              <p className="text-xs text-ink-muted truncate">{profile.mentor.email}</p>
              {profile.mentor.department && (
                <p className="text-[11px] text-sage-dark mt-0.5">{profile.mentor.department}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold text-danger hover:text-danger/80 transition-all"
          >
            <Unlink size={12} />
            {leaving ? 'Leaving…' : 'Leave mentor'}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs text-ink-muted mb-3">
            Enter the code your mentor shared with you to link your account.
          </p>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="MNT-XXXXX"
              maxLength={9}
              className="flex-1 px-3 py-2.5 bg-white border border-sand rounded-xl text-sm font-bold text-ink tracking-widest placeholder-ink-faint focus:outline-none focus:border-ember transition-all uppercase"
            />
            <button
              type="submit"
              disabled={joining || !code.trim()}
              className="flex items-center gap-1.5 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm"
            >
              {joining ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              Join
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-danger text-xs bg-danger-pale border border-danger/25 rounded-xl px-3 py-2.5">
          <AlertTriangle size={13} className="flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="mt-3 flex items-center gap-2 text-sage-dark text-xs bg-sage-pale border border-sage/30 rounded-xl px-3 py-2.5">
          <CheckCircle size={13} className="flex-shrink-0" />{success}
        </div>
      )}
    </div>
  );
}

// ─── Main ProfilePage ───────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await profileAPI.get();
      setProfile(res.data);
      setError('');
    } catch {
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
    // Also update the localStorage user object so the nav stays in sync
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    stored.name = updatedProfile.name;
    localStorage.setItem('user', JSON.stringify(stored));
  };

  const handleRegenerate = async () => {
    try {
      const res = await profileAPI.regenerateCode();
      setProfile(prev => ({ ...prev, mentorCode: res.data.mentorCode }));
      // Update localStorage too
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.mentorCode = res.data.mentorCode;
      localStorage.setItem('user', JSON.stringify(stored));
    } catch {
      setError('Could not regenerate code.');
    }
  };

  const isMentor = profile?.role === 'mentor';

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading your profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      {/* Page header — eyebrow + title (matching ClassCountPage) */}
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <UserCircle size={22} className="text-ink-muted" /> Profile
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          {isMentor
            ? 'Manage your faculty profile and share your mentor code with students.'
            : 'Update your academic details and connect with your mentor.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchProfile} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      <div className="space-y-4">
        {/* Role badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            isMentor
              ? 'bg-trail-pale text-trail-dark border border-trail/30'
              : 'bg-sage-pale text-sage-dark border border-sage/30'
          }`}>
            {isMentor ? <Shield size={12} /> : <GraduationCap size={12} />}
            {isMentor ? 'Mentor' : 'Student'}
          </span>
          <span className="text-xs text-ink-faint">{profile?.email}</span>
        </div>

        {/* Profile editing section */}
        {isMentor ? (
          <>
            <MentorCodeCard code={profile?.mentorCode} onRegenerate={handleRegenerate} />
            <MentorProfile profile={profile} onUpdate={handleProfileUpdate} />
          </>
        ) : (
          <>
            <JoinMentorCard profile={profile} onRefresh={fetchProfile} />
            <StudentProfile profile={profile} onUpdate={handleProfileUpdate} />
          </>
        )}
      </div>
    </div>
  );
}

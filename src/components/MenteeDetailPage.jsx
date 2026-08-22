import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Loader2, AlertTriangle, UserCircle, CalendarDays,
  BarChart2, BookOpen, Clock, Unlink, FileText, CheckCircle, XCircle,
  ClockIcon
} from 'lucide-react';
import { mentorAPI } from '../api';

const TYPE_LABELS = {
  sick_leave: 'Sick Leave',
  test_absence: 'Test Absence',
  general_leave: 'General Leave',
  retest_request: 'Retest Request',
  other: 'Other',
};

const STATUS_STYLES = {
  pending: 'bg-caution-pale text-caution border-caution/30',
  approved: 'bg-sage-pale text-sage-dark border-sage/30',
  rejected: 'bg-danger-pale text-danger border-danger/30',
  withdrawn: 'bg-map text-ink-faint border-sand',
};

function SubjectAttendanceRow({ subject }) {
  const pct = subject.percentage;
  const atRisk = subject.atRisk;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-sand last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink truncate">{subject.name}</p>
        <p className="text-[11px] text-ink-muted">
          {subject.attended}/{subject.conducted} attended
          <span className="text-ink-faint"> · {subject.absent} absent</span>
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-base font-display font-bold ${
          pct === null ? 'text-ink-faint' :
          atRisk ? 'text-danger' :
          pct < 80 ? 'text-caution' : 'text-sage-dark'
        }`}>
          {pct !== null ? `${Math.round(pct)}%` : '—'}
        </p>
      </div>
    </div>
  );
}

export default function MenteeDetailPage({ studentId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await mentorAPI.getMentee(studentId);
      setData(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('This student is not assigned to you.');
      } else {
        setError('Could not load student details.');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleRemove = async () => {
    if (!confirm('Remove this mentee? They will need to rejoin using your code.')) return;
    setRemoving(true);
    try {
      await mentorAPI.removeMentee(studentId);
      onBack();
    } catch {
      setError('Could not remove mentee.');
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading student details…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to mentees
        </button>
        <div className="flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const { student, overall, subjects, grades, applications, lastSync } = data;
  const pct = overall?.percentage;
  const atRisk = overall?.atRisk;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to mentees
      </button>

      {/* Student header */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
            atRisk ? 'bg-danger-pale text-danger' : 'bg-sage-pale text-sage-dark'
          }`}>
            {(student.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-display font-bold text-ink">{student.name}</h1>
              {atRisk && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-danger bg-danger-pale px-2 py-0.5 rounded-full">
                  <AlertTriangle size={9} /> At Risk
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted mt-1">
              {student.rollNo && <span>{student.rollNo}</span>}
              {student.division && <span>Div {student.division}</span>}
              {student.program && <span>{student.program}</span>}
              {student.semester && <span>Sem {student.semester}</span>}
            </div>
            <p className="text-[11px] text-ink-faint mt-1">{student.email}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-2xl font-display font-bold ${
              pct === null ? 'text-ink-faint' : atRisk ? 'text-danger' : pct < 80 ? 'text-caution' : 'text-sage-dark'
            }`}>
              {pct !== null ? `${Math.round(pct)}%` : '—'}
            </p>
            <p className="text-[10px] text-ink-muted">overall</p>
          </div>
        </div>
        {lastSync && (
          <p className="text-[10px] text-ink-faint mt-3 flex items-center gap-1">
            <Clock size={9} />
            Last sync: {new Date(lastSync).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Per-subject attendance */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
        <h2 className="text-sm font-display font-bold text-ink mb-3 flex items-center gap-2">
          <CalendarDays size={14} className="text-ink-muted" /> Attendance by Subject
        </h2>
        {subjects && subjects.length > 0 ? (
          <div className="divide-y divide-sand">
            {subjects.map(s => (
              <SubjectAttendanceRow key={s._id} subject={s} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No subjects found for this student.</p>
        )}
      </div>

      {/* Grades */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
        <h2 className="text-sm font-display font-bold text-ink mb-3 flex items-center gap-2">
          <BarChart2 size={14} className="text-ink-muted" /> Grades
        </h2>
        {grades && grades.length > 0 ? (
          <div className="space-y-2">
            {grades.map(g => (
              <div key={g._id} className="flex items-center gap-3 py-2 border-b border-sand last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{g.title}</p>
                  <p className="text-[11px] text-ink-muted">
                    {g.subject?.name || 'No subject'} · {g.examType}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-display font-bold text-ink">
                    {g.score}<span className="text-ink-faint">/{g.maxScore}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No grades recorded yet.</p>
        )}
      </div>

      {/* Recent applications */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
        <h2 className="text-sm font-display font-bold text-ink mb-3 flex items-center gap-2">
          <FileText size={14} className="text-ink-muted" /> Recent Applications
        </h2>
        {applications && applications.length > 0 ? (
          <div className="space-y-2">
            {applications.map(app => (
              <div key={app._id} className="flex items-center gap-3 py-2 border-b border-sand last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{app.title}</p>
                  <p className="text-[11px] text-ink-muted">
                    {TYPE_LABELS[app.type] || app.type} · {new Date(app.fromDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    {app.fromDate !== app.toDate && ` – ${new Date(app.toDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[app.status]}`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No applications from this student.</p>
        )}
      </div>

      {/* Remove mentee */}
      <div className="mb-4">
        <button
          onClick={handleRemove}
          disabled={removing}
          className="flex items-center gap-1.5 text-xs font-bold text-danger hover:text-danger/80 transition-all"
        >
          <Unlink size={12} />
          {removing ? 'Removing…' : 'Remove this mentee'}
        </button>
        <p className="text-[10px] text-ink-faint mt-1">
          Removing a mentee revokes your access to their data immediately. They can rejoin using your code.
        </p>
      </div>
    </div>
  );
}

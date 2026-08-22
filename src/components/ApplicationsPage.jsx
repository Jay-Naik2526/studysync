import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Loader2, AlertTriangle, Plus, Send, X, Paperclip,
  CheckCircle, XCircle, Clock, Undo2, Filter, CalendarDays, ChevronDown
} from 'lucide-react';
import { applicationsAPI, subjectsAPI } from '../api';

const TYPE_OPTIONS = [
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'test_absence', label: 'Test Absence' },
  { value: 'general_leave', label: 'General Leave' },
  { value: 'retest_request', label: 'Retest Request' },
  { value: 'other', label: 'Other' },
];

const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS.map(t => [t.value, t.label]));

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_STYLES = {
  pending: 'bg-caution-pale text-caution border-caution/30',
  approved: 'bg-sage-pale text-sage-dark border-sage/30',
  rejected: 'bg-danger-pale text-danger border-danger/30',
  withdrawn: 'bg-map text-ink-faint border-sand',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  withdrawn: Undo2,
};

function SubmitForm({ onSubmit, onCancel, subjects }) {
  const [type, setType] = useState('sick_leave');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !reason.trim() || !fromDate || !toDate) {
      setError('Please fill in all required fields.');
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      setError('End date must be on or after start date.');
      return;
    }

    setSubmitting(true); setError('');

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title.trim());
    formData.append('reason', reason.trim());
    formData.append('fromDate', fromDate);
    formData.append('toDate', toDate);
    if (subjectId) formData.append('subject', subjectId);
    if (file) formData.append('attachment', file);

    try {
      await onSubmit(formData);
      onCancel(); // close form on success
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.');
      e.target.value = '';
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      setError('Only JPEG, PNG, and PDF files are allowed.');
      e.target.value = '';
      return;
    }
    setFile(f);
    setError('');
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-sand rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ember transition-all";

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-display font-bold text-ink flex items-center gap-2">
          <Send size={14} className="text-ink-muted" /> New Application
        </h2>
        <button onClick={onCancel} className="text-ink-faint hover:text-ink transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Type */}
        <div>
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Type *</label>
          <div className="relative">
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className={inputClass + ' appearance-none pr-8'}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Sick leave — fever"
            maxLength={150}
            className={inputClass}
            required
          />
        </div>

        {/* Reason */}
        <div>
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Reason *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain the reason for your application…"
            maxLength={2000}
            rows={3}
            className={inputClass + ' resize-none'}
            required
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">From *</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">To *</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Subject (optional) */}
        {subjects.length > 0 && (
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">Subject (optional)</label>
            <div className="relative">
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className={inputClass + ' appearance-none pr-8'}
              >
                <option value="">— None —</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            </div>
          </div>
        )}

        {/* Attachment */}
        <div>
          <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1 block">
            <Paperclip size={10} className="inline mr-1" />
            Attachment (optional, max 5 MB)
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            className="w-full text-xs text-ink file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-map file:text-ink-muted hover:file:bg-sand transition-all"
          />
          {file && (
            <p className="text-[11px] text-sage-dark mt-1 flex items-center gap-1">
              <Paperclip size={10} /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-danger text-xs bg-danger-pale border border-danger/25 rounded-xl px-3 py-2.5">
            <AlertTriangle size={13} className="flex-shrink-0" />{error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}

function ApplicationCard({ app, onWithdraw }) {
  const StatusIcon = STATUS_ICONS[app.status] || Clock;
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!confirm('Withdraw this application?')) return;
    setWithdrawing(true);
    try {
      await onWithdraw(app._id);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{app.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            <span className="text-[11px] text-trail-dark font-bold">{TYPE_LABELS[app.type] || app.type}</span>
            {app.subject?.name && <span className="text-[11px] text-ink-faint">· {app.subject.name}</span>}
          </div>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[app.status]}`}>
          <StatusIcon size={10} /> {app.status}
        </span>
      </div>

      <p className="text-xs text-ink-muted mb-2 line-clamp-2">{app.reason}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint mb-2">
        <span className="flex items-center gap-1">
          <CalendarDays size={10} />
          {new Date(app.fromDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          {app.fromDate !== app.toDate && ` – ${new Date(app.toDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
        </span>
        <span>Submitted {new Date(app.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
      </div>

      {app.attachment?.publicId && (
        <p className="text-[11px] text-trail-dark font-bold flex items-center gap-1 mb-2">
          <Paperclip size={10} /> {app.attachment.originalName || 'Attachment'}
        </p>
      )}

      {/* Mentor remarks */}
      {app.mentorRemarks && app.status !== 'pending' && (
        <div className="bg-map rounded-lg px-3 py-2 mb-2">
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">Mentor Remarks</p>
          <p className="text-xs text-ink">{app.mentorRemarks}</p>
        </div>
      )}

      {app.decidedAt && app.status !== 'pending' && (
        <p className="text-[10px] text-ink-faint">
          {app.status === 'approved' ? 'Approved' : 'Rejected'} on {new Date(app.decidedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      {app.status === 'pending' && (
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold text-danger hover:text-danger/80 transition-all"
        >
          <Undo2 size={12} />
          {withdrawing ? 'Withdrawing…' : 'Withdraw'}
        </button>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApplications = useCallback(async () => {
    try {
      const res = await applicationsAPI.getAll(statusFilter !== 'all' ? statusFilter : undefined);
      setApplications(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await subjectsAPI.getAll();
      setSubjects(res.data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { setLoading(true); fetchApplications(); }, [fetchApplications]);
  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleSubmit = async (formData) => {
    await applicationsAPI.submit(formData);
    fetchApplications();
  };

  const handleWithdraw = async (id) => {
    try {
      await applicationsAPI.withdraw(id);
      fetchApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not withdraw application.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 size={14} className="animate-spin" /> Loading applications…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
      {/* Page header */}
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Requests</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <FileText size={22} className="text-ink-muted" /> Applications
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          Submit leave requests and track their status.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchApplications} className="underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* New application button / form */}
      {showForm ? (
        <SubmitForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          subjects={subjects}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 bg-ember hover:bg-ember-dark text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm"
        >
          <Plus size={16} /> New Application
        </button>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto">
        <Filter size={12} className="text-ink-faint flex-shrink-0" />
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
              statusFilter === opt.value
                ? 'bg-ember text-white'
                : 'bg-parchment text-ink-muted border border-sand hover:border-sand-dark'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Applications list */}
      {applications.length === 0 ? (
        <div className="bg-parchment border border-sand rounded-2xl p-8 text-center shadow-sm">
          <FileText size={24} className="mx-auto text-ink-faint mb-2" />
          <p className="text-sm font-bold text-ink mb-1">No applications</p>
          <p className="text-sm text-ink-muted">
            {statusFilter !== 'all'
              ? `No ${statusFilter} applications found.`
              : 'Submit your first application using the button above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard
              key={app._id}
              app={app}
              onWithdraw={handleWithdraw}
            />
          ))}
        </div>
      )}
    </div>
  );
}

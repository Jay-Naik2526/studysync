import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Loader2, AlertTriangle, CheckCircle, XCircle, Clock,
  FileText, Paperclip, Eye, MessageSquare, Filter
} from 'lucide-react';
import { mentorAPI, applicationsAPI } from '../api';

const TYPE_LABELS = {
  sick_leave: 'Sick Leave',
  test_absence: 'Test Absence',
  general_leave: 'General Leave',
  retest_request: 'Retest Request',
  other: 'Other',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
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
  withdrawn: XCircle,
};

function DecideModal({ application, onClose, onDecide }) {
  const [status, setStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onDecide(application._id, { status, mentorRemarks: remarks });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-parchment border border-sand rounded-2xl p-5 sm:p-6 shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-display font-bold text-ink mb-1">Review Application</h3>
        <p className="text-xs text-ink-muted mb-4 truncate">{application.title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">Decision</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  status === 'approved'
                    ? 'bg-sage-pale text-sage-dark border-sage'
                    : 'bg-white text-ink-muted border-sand hover:border-sand-dark'
                }`}
              >
                <CheckCircle size={14} /> Approve
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  status === 'rejected'
                    ? 'bg-danger-pale text-danger border-danger/50'
                    : 'bg-white text-ink-muted border-sand hover:border-sand-dark'
                }`}
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5 block">
              <MessageSquare size={10} className="inline mr-1" />
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Add remarks for the student…"
              className="w-full px-3 py-2.5 bg-white border border-sand rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ember transition-all resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold text-ink-muted border border-sand rounded-xl hover:bg-map transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm disabled:opacity-50 ${
                status === 'approved' ? 'bg-sage hover:bg-sage-dark' : 'bg-danger hover:bg-danger/80'
              }`}
            >
              {submitting ? 'Submitting…' : status === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplicationCard({ app, onDecide, onViewAttachment }) {
  const StatusIcon = STATUS_ICONS[app.status] || Clock;

  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">{app.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            <span className="text-[11px] text-ink-muted">{app.student?.name || 'Unknown'}</span>
            {app.student?.rollNo && <span className="text-[11px] text-ink-faint">{app.student.rollNo}</span>}
            <span className="text-[11px] text-trail-dark font-bold">{TYPE_LABELS[app.type] || app.type}</span>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[app.status]}`}>
          <StatusIcon size={10} /> {app.status}
        </span>
      </div>

      <p className="text-xs text-ink-muted mb-2 line-clamp-2">{app.reason}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint mb-3">
        <span>
          {new Date(app.fromDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          {app.fromDate !== app.toDate && ` – ${new Date(app.toDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
        </span>
        {app.subject?.name && <span>· {app.subject.name}</span>}
        <span>· Submitted {new Date(app.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {app.attachment?.publicId && (
        <button
          onClick={() => onViewAttachment(app._id)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-trail-dark hover:text-trail mb-3 transition-colors"
        >
          <Paperclip size={11} /> {app.attachment.originalName || 'Attachment'}
        </button>
      )}

      {app.mentorRemarks && app.status !== 'pending' && (
        <div className="bg-map rounded-lg px-3 py-2 mb-3">
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">Remarks</p>
          <p className="text-xs text-ink">{app.mentorRemarks}</p>
        </div>
      )}

      {app.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onDecide(app)}
            className="flex items-center gap-1.5 bg-ember hover:bg-ember-dark text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-sm"
          >
            <Eye size={12} /> Review
          </button>
        </div>
      )}
    </div>
  );
}

export default function MentorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(null); // application being decided

  const fetchApplications = useCallback(async () => {
    try {
      const res = await mentorAPI.getApplications(statusFilter);
      setApplications(res.data);
      setError('');
    } catch {
      setError('Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { setLoading(true); fetchApplications(); }, [fetchApplications]);

  const handleDecide = async (appId, decision) => {
    try {
      await mentorAPI.decideApplication(appId, decision);
      fetchApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not process decision.');
    }
  };

  const handleViewAttachment = async (appId) => {
    try {
      const res = await applicationsAPI.getAttachmentUrl(appId);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch {
      setError('Could not load attachment.');
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
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Inbox</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight flex items-center gap-2">
          <Inbox size={22} className="text-ink-muted" /> Applications
        </h1>
        <p className="text-xs text-ink-muted mt-1.5">
          Review and respond to student applications.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-xs font-medium text-danger bg-danger-pale border border-danger/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchApplications} className="underline flex-shrink-0">Retry</button>
        </div>
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
          <p className="text-sm font-bold text-ink mb-1">No {statusFilter !== 'all' ? statusFilter : ''} applications</p>
          <p className="text-sm text-ink-muted">
            {statusFilter === 'pending'
              ? 'All caught up! No pending applications.'
              : 'No applications match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard
              key={app._id}
              app={app}
              onDecide={setDeciding}
              onViewAttachment={handleViewAttachment}
            />
          ))}
        </div>
      )}

      {/* Decision modal */}
      {deciding && (
        <DecideModal
          application={deciding}
          onClose={() => setDeciding(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}

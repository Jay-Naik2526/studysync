import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, AlertTriangle, Download, FileText, TrendingUp, RefreshCw, Link, Unlink, X, Loader2 } from 'lucide-react';
import { subjectsAPI, sapAPI } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Ring({ pct, color, size = 52, stroke = 5 }) {
  const r = size / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ minWidth: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(43,43,38,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${circ} ${circ}`}
        style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.7s ease' }} />
    </svg>
  );
}

function SubjectCard({ subject, onUpdate, onDelete }) {
  const { name, conductedClasses = 0, absentClasses = 0, totalPlannedClasses = 0, _id } = subject;

  // Interactive Simulation State
  const [simAttended, setSimAttended] = useState(0);
  const [simAbsent, setSimAbsent] = useState(0);
  const isSimulating = simAttended > 0 || simAbsent > 0;

  // Recalculated values based on simulation inputs
  const simulatedConducted = conductedClasses + simAttended + simAbsent;
  const simulatedAbsent = absentClasses + simAbsent;
  const present = Math.max(simulatedConducted - simulatedAbsent, 0);

  const pct = simulatedConducted > 0 ? (present / simulatedConducted) * 100 : 0;
  const onTrack = pct >= 80;
  const maxSkip = Math.floor(totalPlannedClasses * 0.2);
  const canSkip = Math.max(maxSkip - simulatedAbsent, 0);

  const set = (field, val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) onUpdate(_id, { [field]: n });
  };

  const resetSimulation = () => {
    setSimAttended(0);
    setSimAbsent(0);
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-5 transition-all shadow-sm ${isSimulating ? 'bg-trail-pale border-trail/40' : 'bg-parchment border-sand hover:border-sand-dark'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <Ring pct={pct} color={onTrack ? '#7C9070' : '#A93B2B'} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-display font-bold tabular-nums"
              style={{ color: onTrack ? '#4A5A40' : '#A93B2B' }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-ink text-sm leading-tight truncate">{name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {onTrack
                ? <><CheckCircle size={10} className="text-sage-dark flex-shrink-0" /><span className="text-[11px] text-sage-dark">On track</span></>
                : <><AlertTriangle size={10} className="text-danger flex-shrink-0" /><span className="text-[11px] text-danger">Below 80%</span></>
              }
              {isSimulating && (
                <span className="text-[9px] font-bold text-trail-dark bg-trail/15 px-1.5 py-0.5 rounded uppercase tracking-wider">Simulating</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm(`Delete "${name}"?`)) onDelete(_id); }}
          className="text-ink-faint hover:text-danger transition-colors p-1 flex-shrink-0 ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Editable inputs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Conducted', field: 'conductedClasses', value: conductedClasses },
          { label: 'Absent', field: 'absentClasses', value: absentClasses },
          { label: 'Planned', field: 'totalPlannedClasses', value: totalPlannedClasses },
        ].map(({ label, field, value }) => (
          <div key={field} className="bg-map rounded-xl p-2.5 border border-sand">
            <p className="text-[10px] text-ink-muted mb-0.5 leading-none">{label}</p>
            <input
              type="number" value={value}
              onChange={e => set(field, e.target.value)}
              className="w-full bg-transparent text-ink font-bold text-sm sm:text-base leading-none focus:outline-none tabular-nums"
            />
          </div>
        ))}
      </div>

      {/* Interactive Simulation Controls */}
      <div className="bg-white/50 border border-sand rounded-xl p-2.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-trail-dark uppercase tracking-wider">What-if predictor</p>
          {isSimulating && (
            <button onClick={resetSimulation} className="text-[10px] font-medium text-ink-muted hover:text-ink transition-colors">Reset</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between bg-sage-pale border border-sage/25 rounded-lg p-1.5 px-2">
            <span className="text-[11px] text-sage-dark">Attend next:</span>
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <button disabled={simAttended <= 0} onClick={() => setSimAttended(prev => Math.max(0, prev - 1))} className="w-5 h-5 bg-white border border-sand hover:border-sand-dark rounded flex items-center justify-center disabled:opacity-30">-</button>
              <span className="w-4 text-center text-xs tabular-nums">{simAttended}</span>
              <button onClick={() => setSimAttended(prev => prev + 1)} className="w-5 h-5 bg-white border border-sand hover:border-sand-dark rounded flex items-center justify-center">+</button>
            </div>
          </div>
          <div className="flex items-center justify-between bg-danger-pale border border-danger/20 rounded-lg p-1.5 px-2">
            <span className="text-[11px] text-danger">Skip next:</span>
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <button disabled={simAbsent <= 0} onClick={() => setSimAbsent(prev => Math.max(0, prev - 1))} className="w-5 h-5 bg-white border border-sand hover:border-sand-dark rounded flex items-center justify-center disabled:opacity-30">-</button>
              <span className="w-4 text-center text-xs tabular-nums">{simAbsent}</span>
              <button onClick={() => setSimAbsent(prev => prev + 1)} className="w-5 h-5 bg-white border border-sand hover:border-sand-dark rounded flex items-center justify-center">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Read-only stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-map rounded-xl p-2.5 border border-sand">
          <p className="text-[10px] text-ink-muted leading-none mb-0.5">Present</p>
          <p className="font-bold text-ink text-sm sm:text-base tabular-nums">{present}</p>
        </div>
        <div className="bg-map rounded-xl p-2.5 border border-sand">
          <p className="text-[10px] text-ink-muted leading-none mb-0.5">Can skip</p>
          <p className={`font-bold text-sm sm:text-base tabular-nums ${canSkip > 0 ? 'text-sage-dark' : 'text-danger'}`}>{canSkip}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryStrip({ subjects }) {
  const { overall, good, atRisk } = useMemo(() => {
    const tc = subjects.reduce((s, x) => s + (x.conductedClasses || 0), 0);
    const ta = subjects.reduce((s, x) => s + (x.absentClasses || 0), 0);
    const overall = tc > 0 ? ((tc - ta) / tc) * 100 : 0;
    const good = subjects.filter(s => {
      const p = s.conductedClasses > 0 ? ((s.conductedClasses - s.absentClasses) / s.conductedClasses) * 100 : 100;
      return p >= 80;
    }).length;
    return { overall, good, atRisk: subjects.length - good };
  }, [subjects]);

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { label: 'Overall', value: `${overall.toFixed(1)}%`, color: '#3E566C' },
        { label: 'On track', value: good, color: '#4A5A40' },
        { label: 'At risk', value: atRisk, color: '#A8842C' },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-parchment border border-sand rounded-2xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-[10px] text-ink-muted mb-0.5 uppercase tracking-wide">{label}</p>
          <p className="text-xl sm:text-2xl font-display font-bold leading-none tabular-nums" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── SAP Connect Modal ────────────────────────────────────────────
function SapModal({ onClose, onSaved }) {
  const [sapUser, setSapUser] = useState('');
  const [sapPass, setSapPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await sapAPI.saveCredentials({ username: sapUser, password: sapPass });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-parchment border border-sand rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-display font-bold text-ink">Connect SAP portal</h3>
            <p className="text-xs text-ink-muted mt-0.5">Stored encrypted. Used only to sync attendance.</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">SAP user ID</label>
            <input type="text" placeholder="e.g. 70552400047" value={sapUser} onChange={e => setSapUser(e.target.value)}
              className="w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={sapPass} onChange={e => setSapPass(e.target.value)}
              className="w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember" required />
          </div>
          {err && <p className="text-xs text-danger">{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-sm">
            {saving ? 'Saving…' : 'Save & connect'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [subjects, setSubjects] = useState([]);
  const [newName, setNewName] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  // SAP sync state
  const [sapStatus, setSapStatus] = useState(null); // null | { connected, lastSync, lastSyncStatus, lastSyncMessage }
  const [showSapModal, setShowSapModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Academic Year auto-defaults to the currently running year (flips every July 1)
  // so this works out of the box for any student, any year — no hardcoding.
  const defaultAcademicYear = () => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() + 1 >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  };
  const academicYearOptions = (() => {
    const [start] = defaultAcademicYear().split('-').map(Number);
    // Offer the current year plus a couple before it, for students re-syncing past semesters
    return [start, start - 1, start - 2].map(y => `${y}-${y + 1}`);
  })();
  const SEMESTER_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('sap_academicYear') || defaultAcademicYear());
  const [semester, setSemester] = useState(() => localStorage.getItem('sap_semester') || '');

  useEffect(() => { localStorage.setItem('sap_academicYear', academicYear); }, [academicYear]);
  useEffect(() => { localStorage.setItem('sap_semester', semester); }, [semester]);

  const fetchSubjects = async () => {
    try { setSubjects((await subjectsAPI.getAll()).data); }
    catch { setError('Could not load subjects.'); }
  };

  const fetchSapStatus = useCallback(async () => {
    try { setSapStatus((await sapAPI.getStatus()).data); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSubjects(); fetchSapStatus(); }, []);

  const handleSapSync = async () => {
    if (!semester) {
      setSyncMsg('✗ Please select your Semester/Trimester first.');
      return;
    }
    setSyncing(true);
    setSyncMsg('Starting sync — this takes ~1 minute…');
    try {
      await sapAPI.sync({ academicYear, semester });
      // Poll for completion, surfacing each backend step live
      const poll = setInterval(async () => {
        const { data } = await sapAPI.getStatus();
        setSapStatus(data);
        if (data.lastSyncStatus === 'success') {
          setSyncMsg(`✓ ${data.lastSyncMessage}`);
          setSyncing(false);
          clearInterval(poll);
          fetchSubjects(); // refresh attendance numbers
        } else if (data.lastSyncStatus === 'failed') {
          setSyncMsg(`✗ ${data.lastSyncMessage}`);
          setSyncing(false);
          clearInterval(poll);
        } else if (data.lastSyncStatus === 'running' && data.lastSyncProgress) {
          setSyncMsg(data.lastSyncProgress);
        }
      }, 3000);
    } catch (e) {
      setSyncMsg(e.response?.data?.message || 'Sync failed.');
      setSyncing(false);
    }
  };

  const handleSapDisconnect = async () => {
    if (!window.confirm('Remove SAP credentials?')) return;
    await sapAPI.disconnect();
    setSapStatus({ connected: false });
    setSyncMsg('');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await subjectsAPI.create({ name: newName.trim(), totalPlannedClasses: newTotal || 0 });
      setNewName(''); setNewTotal('');
      fetchSubjects();
    } catch { setError('Failed to add subject.'); }
    finally { setAdding(false); }
  };

  const handleUpdate = async (id, data) => {
    setSubjects(s => s.map(x => x._id === id ? { ...x, ...data } : x));
    try { await subjectsAPI.update(id, data); } catch { setError('Failed to save.'); }
  };

  const handleDelete = async (id) => {
    try { await subjectsAPI.delete(id); setSubjects(s => s.filter(x => x._id !== id)); }
    catch { setError('Failed to delete.'); }
  };

  const exportCsv = () => {
    const rows = subjects.map(s => {
      const p = Math.max(s.conductedClasses - s.absentClasses, 0);
      const pct = s.conductedClasses > 0 ? (p / s.conductedClasses) * 100 : 100;
      const ms = Math.floor(s.totalPlannedClasses * 0.2);
      return [s.name, pct.toFixed(2), pct >= 80 ? 'On Track' : 'At Risk', s.conductedClasses, p, s.absentClasses, s.totalPlannedClasses, ms, Math.max(ms - s.absentClasses, 0)].join(',');
    });
    const blob = new Blob([['Subject,Att%,Status,Conducted,Present,Absent,Planned,MaxSkip,RemSkip', ...rows].join('\n')], { type: 'text/csv' });
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'attendance.csv' }).click();
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 16);
    autoTable(doc, {
      head: [['Subject', 'Att%', 'Status', 'Conducted', 'Present', 'Absent', 'Max Skip', 'Remaining']],
      body: subjects.map(s => {
        const p = Math.max(s.conductedClasses - s.absentClasses, 0);
        const pct = s.conductedClasses > 0 ? (p / s.conductedClasses) * 100 : 100;
        const ms = Math.floor(s.totalPlannedClasses * 0.2);
        return [s.name, `${pct.toFixed(1)}%`, pct >= 80 ? 'On Track' : 'At Risk', s.conductedClasses, p, s.absentClasses, ms, Math.max(ms - s.absentClasses, 0)];
      }),
      startY: 22, theme: 'striped', headStyles: { fillColor: [124, 144, 112] },
    });
    doc.save('attendance.pdf');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-7">
        <div>
          <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Trail log</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">Attendance</h1>
        </div>
        {subjects.length > 0 && (
          <div className="flex gap-2 mt-1 flex-shrink-0">
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-map border border-sand rounded-xl text-xs font-medium text-ink-muted hover:text-ink transition-all">
              <Download size={12} /><span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={exportPdf} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-map border border-sand rounded-xl text-xs font-medium text-ink-muted hover:text-ink transition-all">
              <FileText size={12} /><span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        )}
      </div>

      {subjects.length > 0 && <SummaryStrip subjects={subjects} />}

      {/* SAP Auto-Sync Panel */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sapStatus?.connected ? 'bg-sage-pale' : 'bg-map'}`}>
              {sapStatus?.connected ? <Link size={15} className="text-sage-dark" /> : <Link size={15} className="text-ink-faint" />}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">
                SAP portal sync
                {sapStatus?.connected && <span className="ml-2 text-[10px] font-bold text-sage-dark bg-sage-pale px-2 py-0.5 rounded-full">Connected</span>}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                {sapStatus?.connected ? (
                  <>
                    {sapStatus.lastSync ? `Last synced: ${new Date(sapStatus.lastSync).toLocaleString()}` : 'Never synced — hit Sync now'}
                    {sapStatus.lastAttendanceDate && (
                      <span className="block text-[11px] text-trail-dark font-medium mt-1">
                        Portal data marked up to: {new Date(sapStatus.lastAttendanceDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    )}
                  </>
                ) : (
                  'Connect once, auto-sync your SVKM attendance'
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {sapStatus?.connected ? (
              <>
                <button
                  onClick={handleSapSync} disabled={syncing || !semester}
                  title={!semester ? 'Select Semester/Trimester first' : undefined}
                  className="flex items-center gap-1.5 px-4 py-2 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
                <button onClick={handleSapDisconnect} className="px-3 py-2 bg-white hover:bg-danger-pale border border-sand hover:border-danger/30 rounded-xl transition-all group">
                  <Unlink size={13} className="text-ink-muted group-hover:text-danger" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowSapModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-ember hover:bg-ember-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                <Link size={13} /> Connect SAP
              </button>
            )}
          </div>
        </div>

        {sapStatus?.connected && (
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Academic year</label>
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-sand rounded-lg text-xs text-ink focus:outline-none focus:border-ember">
                {academicYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Semester / trimester</label>
              <select value={semester} onChange={e => setSemester(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-sand rounded-lg text-xs text-ink focus:outline-none focus:border-ember">
                <option value="">Select…</option>
                {SEMESTER_ROMAN.map(r => <option key={r} value={r}>Semester {r}</option>)}
              </select>
            </div>
          </div>
        )}

        {syncMsg && (
          <p className={`text-xs mt-3 px-3 py-2 rounded-lg ${syncMsg.startsWith('✓') ? 'bg-sage-pale text-sage-dark' : syncMsg.startsWith('✗') ? 'bg-danger-pale text-danger' : 'bg-trail-pale text-trail-dark'}`}>
            {syncMsg}
          </p>
        )}

        {/* Sync Mapping Details Breakdown */}
        {sapStatus?.lastSyncDetails && sapStatus.lastSyncDetails.length > 0 && (
          <div className="mt-4 border-t border-sand pt-4">
            <h4 className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Sync mapping status</h4>
            <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-sand custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-map border-b border-sand text-ink-muted">
                    <th className="p-3 font-bold">SAP course name</th>
                    <th className="p-3 font-bold">StudySync match</th>
                    <th className="p-3 font-bold">Attendance</th>
                    <th className="p-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/60">
                  {sapStatus.lastSyncDetails.map((detail, idx) => {
                    const cleanStr = s => s ? s.toLowerCase().replace(/[()&]/g, ' ').replace(/[^a-z0-9\s]/g, '').trim() : '';
                    const cleanPdf = cleanStr(detail.pdfName);
                    const matchedSub = subjects.find(s => s.portalName && (cleanStr(s.portalName) === cleanPdf || cleanPdf.includes(cleanStr(s.portalName))));
                    const isMatched = detail.status === 'synced' || !!matchedSub;
                    const matchedSubjectName = matchedSub ? matchedSub.name : detail.subjectName;

                    return (
                      <tr key={idx} className="hover:bg-ink/[0.02] transition-colors text-ink">
                        <td className="p-3 font-medium truncate max-w-[200px]" title={detail.pdfName}>
                          {detail.pdfName}
                        </td>
                        <td className="p-3">
                          {isMatched ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sage-dark font-bold">{matchedSubjectName}</span>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Remove mapping for "${detail.pdfName}"?`)) {
                                    const sub = matchedSub || subjects.find(s => s.name === detail.subjectName);
                                    if (sub) {
                                      await handleUpdate(sub._id, {
                                        portalName: "",
                                        conductedClasses: 0,
                                        absentClasses: 0
                                      });
                                      fetchSubjects();
                                      fetchSapStatus();
                                    }
                                  }
                                }}
                                className="text-ink-faint hover:text-danger p-0.5 rounded transition-colors"
                                title="Unlink mapping"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <select
                              onChange={async (e) => {
                                const subId = e.target.value;
                                if (subId) {
                                  await handleUpdate(subId, {
                                    portalName: detail.pdfName,
                                    conductedClasses: detail.conducted,
                                    absentClasses: detail.absent
                                  });
                                  fetchSubjects();
                                  fetchSapStatus();
                                }
                              }}
                              defaultValue=""
                              className="bg-white border border-sand text-ink rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-ember max-w-[150px]"
                            >
                              <option value="" disabled>Map to subject...</option>
                              {subjects.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-ink-muted tabular-nums">
                            {detail.conducted - detail.absent}/{detail.conducted} ({detail.conducted > 0 ? (((detail.conducted - detail.absent) / detail.conducted) * 100).toFixed(0) : 0}%)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {isMatched ? (
                            detail.matchedBy === 'ai' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-trail-dark bg-trail-pale px-2 py-0.5 rounded-full" title="Matched using optimized Gemini fallback">
                                Synced via AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sage-dark bg-sage-pale px-2 py-0.5 rounded-full" title="Matched instantly using fast heuristics">
                                <CheckCircle size={10} /> Synced
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-caution bg-caution-pale px-2 py-0.5 rounded-full" title="To match this, add a subject with this name or acronym">
                              <AlertTriangle size={10} /> Unmatched
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showSapModal && (
        <SapModal
          onClose={() => setShowSapModal(false)}
          onSaved={() => { setShowSapModal(false); fetchSapStatus(); }}
        />
      )}

      {/* Add form */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-3">Add subject</p>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text" placeholder="Subject name" value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-ember transition-all"
            required
          />
          <input
            type="number" placeholder="Total classes" value={newTotal}
            onChange={e => setNewTotal(e.target.value)}
            className="sm:w-40 bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-ember transition-all"
            required
          />
          <button
            type="submit" disabled={adding}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap"
          >
            <Plus size={15} />{adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </div>

      {/* Subject cards */}
      {subjects.length === 0 ? (
        <div className="bg-parchment border border-sand rounded-2xl py-16 flex flex-col items-center gap-3 shadow-sm">
          <TrendingUp size={26} className="text-ink-faint" />
          <p className="text-sm text-ink-muted">Add a subject to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map(s => <SubjectCard key={s._id} subject={s} onUpdate={handleUpdate} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

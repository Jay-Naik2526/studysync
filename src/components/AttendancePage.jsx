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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${circ} ${circ}`}
        style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.7s ease' }} />
    </svg>
  );
}

function SubjectCard({ subject, onUpdate, onDelete }) {
  const { name, conductedClasses = 0, absentClasses = 0, totalPlannedClasses = 0, _id } = subject;
  const present = Math.max(conductedClasses - absentClasses, 0);
  const pct = conductedClasses > 0 ? (present / conductedClasses) * 100 : 0;
  const onTrack = pct >= 80;
  const maxSkip = Math.floor(totalPlannedClasses * 0.2);
  const canSkip = Math.max(maxSkip - absentClasses, 0);

  const set = (field, val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) onUpdate(_id, { [field]: n });
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-5 hover:border-white/[0.13] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <Ring pct={pct} color={onTrack ? '#34d399' : '#f87171'} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black"
              style={{ color: onTrack ? '#34d399' : '#f87171' }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight truncate">{name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              {onTrack
                ? <><CheckCircle size={10} className="text-emerald-400 flex-shrink-0" /><span className="text-[11px] text-emerald-400">On track</span></>
                : <><AlertTriangle size={10} className="text-amber-400 flex-shrink-0" /><span className="text-[11px] text-amber-400">Below 80%</span></>
              }
            </div>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm(`Delete "${name}"?`)) onDelete(_id); }}
          className="text-zinc-700 hover:text-red-400 transition-colors p-1 flex-shrink-0 ml-2"
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
          <div key={field} className="bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.06]">
            <p className="text-[10px] text-zinc-600 mb-0.5 leading-none">{label}</p>
            <input
              type="number" value={value}
              onChange={e => set(field, e.target.value)}
              className="w-full bg-transparent text-white font-bold text-sm sm:text-base leading-none focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Read-only stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.05]">
          <p className="text-[10px] text-zinc-600 leading-none mb-0.5">Present</p>
          <p className="font-bold text-white text-sm sm:text-base">{present}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.05]">
          <p className="text-[10px] text-zinc-600 leading-none mb-0.5">Can Skip</p>
          <p className={`font-bold text-sm sm:text-base ${canSkip > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{canSkip}</p>
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
        { label: 'Overall', value: `${overall.toFixed(1)}%`, color: '#a78bfa' },
        { label: 'On Track', value: good, color: '#34d399' },
        { label: 'At Risk', value: atRisk, color: '#fbbf24' },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 sm:p-4 text-center">
          <p className="text-[10px] text-zinc-600 mb-0.5 uppercase tracking-wide">{label}</p>
          <p className="text-xl sm:text-2xl font-black leading-none" style={{ color }}>{value}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0c17] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Connect SAP Portal</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Stored encrypted. Used only to sync attendance.</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">SAP User ID</label>
            <input type="text" placeholder="e.g. 70552400047" value={sapUser} onChange={e => setSapUser(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={sapPass} onChange={e => setSapPass(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50" required />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all">
            {saving ? 'Saving…' : 'Save & Connect'}
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
    setSyncing(true);
    setSyncMsg('Sync started — this takes ~30 seconds…');
    try {
      await sapAPI.sync();
      // Poll for completion
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
        }
      }, 4000);
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
      startY: 22, theme: 'striped', headStyles: { fillColor: [124, 58, 237] },
    });
    doc.save('attendance.pdf');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-7">
        <div>
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Tracker</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Attendance</h1>
        </div>
        {subjects.length > 0 && (
          <div className="flex gap-2 mt-1 flex-shrink-0">
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-all">
              <Download size={12} /><span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={exportPdf} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-all">
              <FileText size={12} /><span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        )}
      </div>

      {subjects.length > 0 && <SummaryStrip subjects={subjects} />}

      {/* SAP Auto-Sync Panel */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${sapStatus?.connected ? 'bg-emerald-500/15' : 'bg-zinc-800'}`}>
              {sapStatus?.connected ? <Link size={15} className="text-emerald-400" /> : <Link size={15} className="text-zinc-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                SAP Portal Sync
                {sapStatus?.connected && <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Connected</span>}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {sapStatus?.connected ? (
                  <>
                    {sapStatus.lastSync ? `Last synced: ${new Date(sapStatus.lastSync).toLocaleString()}` : 'Never synced — hit Sync Now'}
                    {sapStatus.lastAttendanceDate && (
                      <span className="block text-[11px] text-fuchsia-400 font-medium mt-1">
                        📅 Portal Data Marked Up To: {new Date(sapStatus.lastAttendanceDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                  onClick={handleSapSync} disabled={syncing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all">
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </button>
                <button onClick={handleSapDisconnect} className="px-3 py-2 bg-white/[0.05] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 rounded-xl transition-all">
                  <Unlink size={13} className="text-zinc-500 hover:text-red-400" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowSapModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-semibold transition-all">
                <Link size={13} /> Connect SAP
              </button>
            )}
          </div>
        </div>
        {syncMsg && (
          <p className={`text-xs mt-3 px-3 py-2 rounded-lg ${syncMsg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400' : syncMsg.startsWith('✗') ? 'bg-red-500/10 text-red-400' : 'bg-violet-500/10 text-violet-300'}`}>
            {syncMsg}
          </p>
        )}

        {/* Sync Mapping Details Breakdown */}
        {sapStatus?.lastSyncDetails && sapStatus.lastSyncDetails.length > 0 && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Sync Mapping Status</h4>
            <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-white/[0.05]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400">
                    <th className="p-3 font-semibold">SAP Course Name</th>
                    <th className="p-3 font-semibold">StudySync Match</th>
                    <th className="p-3 font-semibold">Attendance</th>
                    <th className="p-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sapStatus.lastSyncDetails.map((detail, idx) => {
                    const isMatched = detail.status === 'synced';
                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors text-zinc-300">
                        <td className="p-3 font-medium truncate max-w-[200px]" title={detail.pdfName}>
                          {detail.pdfName}
                        </td>
                        <td className="p-3">
                          {isMatched ? (
                            <span className="text-emerald-400 font-medium">{detail.subjectName}</span>
                          ) : (
                            <span className="text-zinc-600 italic">No matching subject</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-zinc-400">
                            {detail.conducted - detail.absent}/{detail.conducted} ({detail.conducted > 0 ? (((detail.conducted - detail.absent) / detail.conducted) * 100).toFixed(0) : 0}%)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {isMatched ? (
                            detail.matchedBy === 'ai' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-full" title="Matched using optimized Gemini fallback">
                                🧠 Synced via AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full" title="Matched instantly using fast heuristics">
                                <CheckCircle size={10} /> Synced
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full" title="To match this, add a subject with this name or acronym">
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
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-5">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Add Subject</p>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text" placeholder="Subject name" value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
            required
          />
          <input
            type="number" placeholder="Total classes" value={newTotal}
            onChange={e => setNewTotal(e.target.value)}
            className="sm:w-40 bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
            required
          />
          <button
            type="submit" disabled={adding}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 whitespace-nowrap"
          >
            <Plus size={15} />{adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Subject cards */}
      {subjects.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl py-16 flex flex-col items-center gap-3">
          <TrendingUp size={26} className="text-zinc-700" />
          <p className="text-sm text-zinc-600">Add a subject to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map(s => <SubjectCard key={s._id} subject={s} onUpdate={handleUpdate} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

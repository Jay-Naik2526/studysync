import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Hash, Award } from 'lucide-react';
import { subjectsAPI } from '../api';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      setSubjects((await subjectsAPI.getAll()).data);
    } catch { setError('Failed to load subjects.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true); setError('');
    try {
      await subjectsAPI.create({ name: name.trim(), totalPlannedClasses: total || 0, totalMarks });
      setName(''); setTotal(''); setTotalMarks(100);
      fetchSubjects();
    } catch { setError('Failed to add subject.'); }
    finally { setAdding(false); }
  };

  const inputClass = "w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-ember transition-all";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-7">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Waypoints</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">Subjects</h1>
      </div>

      {/* Add form */}
      <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-4">Add new subject</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            type="text" placeholder="Subject name" value={name}
            onChange={e => setName(e.target.value)}
            className={inputClass}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Hash size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="number" placeholder="Total classes" value={total}
                onChange={e => setTotal(e.target.value)}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
            <div className="relative">
              <Award size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="number" placeholder="Total marks" value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value))}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
          </div>
          <button
            type="submit" disabled={adding}
            className="w-full py-3 bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Plus size={15} />{adding ? 'Adding…' : 'Add subject'}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </div>

      {/* List */}
      <div className="bg-parchment border border-sand rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-sand flex items-center justify-between">
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Your subjects</p>
          <span className="text-xs text-ink-faint tabular-nums">{subjects.length} total</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">Loading…</div>
        ) : subjects.length === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-map flex items-center justify-center">
              <BookOpen size={18} className="text-ink-faint" />
            </div>
            <p className="text-sm text-ink-muted">No subjects yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-sand/60">
            {subjects.map((s, i) => (
              <div key={s._id} className="px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-ink/[0.02] transition-colors gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                    style={{ background: `hsl(${(i * 47) % 360}, 40%, 88%)`, color: `hsl(${(i * 47) % 360}, 35%, 30%)` }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{s.name}</p>
                    <p className="text-[11px] text-ink-muted">{s.totalPlannedClasses} classes · {s.totalMarks} marks</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

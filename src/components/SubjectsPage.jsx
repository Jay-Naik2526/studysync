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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-7">
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Config</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Subjects</h1>
      </div>

      {/* Add form */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-5">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Add New Subject</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            type="text" placeholder="Subject name" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Hash size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="number" placeholder="Total classes" value={total}
                onChange={e => setTotal(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                required
              />
            </div>
            <div className="relative">
              <Award size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="number" placeholder="Total marks" value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
                required
              />
            </div>
          </div>
          <button
            type="submit" disabled={adding}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus size={15} />{adding ? 'Adding…' : 'Add Subject'}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      </div>

      {/* List */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your Subjects</p>
          <span className="text-xs text-zinc-700">{subjects.length} total</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">Loading…</div>
        ) : subjects.length === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <BookOpen size={18} className="text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600">No subjects yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {subjects.map((s, i) => (
              <div key={s._id} className="px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: `hsl(${(i * 47) % 360}, 55%, 22%)`, color: `hsl(${(i * 47) % 360}, 75%, 70%)` }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                    <p className="text-[11px] text-zinc-600">{s.totalPlannedClasses} classes · {s.totalMarks} marks</p>
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

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Target, CheckSquare, Square, TrendingUp, BookOpen, ChevronRight } from 'lucide-react';
import { subjectsAPI, gradesAPI, todosAPI } from '../api';

function Bar({ value, max = 100, color = '#a78bfa' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-white/[0.05] rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function GoalCalc({ subject, grades }) {
  const [target, setTarget] = useState(90);
  const result = useMemo(() => {
    const total = subject.totalMarks;
    const scored = grades.reduce((s, g) => s + g.score, 0);
    const accounted = grades.reduce((s, g) => s + g.maxScore, 0);
    if (accounted >= total) return { done: true };
    const needed = (target / 100) * total - scored;
    const remaining = total - accounted;
    if (needed <= 0) return { achieved: true, target };
    if (needed > remaining) return { impossible: true };
    return { pct: (needed / remaining * 100).toFixed(1), needed: needed.toFixed(1), remaining };
  }, [target, subject, grades]);

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 flex-1 min-w-0">
          <Target size={12} className="text-violet-400 flex-shrink-0" />
          <span className="truncate">Goal Calculator</span>
        </h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input type="number" value={target} onChange={e => setTarget(Number(e.target.value) || 0)}
            className="w-12 bg-white/[0.07] text-white text-xs font-bold text-center rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500/40" />
          <span className="text-xs text-zinc-500">%</span>
        </div>
      </div>
      <div className={`rounded-lg px-4 py-3 text-center text-sm ${result.achieved ? 'bg-emerald-500/10 text-emerald-400' : result.impossible ? 'bg-red-500/10 text-red-400' : result.done ? 'bg-white/[0.05] text-zinc-400' : 'bg-violet-500/10'}`}>
        {result.done && <p>All marks entered.</p>}
        {result.achieved && <p>Already achieved {target}%! 🎉</p>}
        {result.impossible && <p>Not possible with remaining marks.</p>}
        {result.pct && (
          <>
            <p className="text-xs text-zinc-500 mb-1">Need to score on remaining marks</p>
            <p className="text-3xl font-black text-violet-400">{result.pct}%</p>
            <p className="text-xs text-zinc-600 mt-1">({result.needed} of {result.remaining} marks)</p>
          </>
        )}
      </div>
    </div>
  );
}

function GradeRow({ grade, onUpdate, onDelete }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06] group">
      <span className="flex-1 text-xs text-zinc-300 truncate min-w-0">{grade.title}</span>
      <input type="number" value={grade.score}
        onChange={e => onUpdate(grade._id, { score: parseInt(e.target.value) || 0 })}
        className="w-12 bg-white/[0.07] text-white text-xs font-bold text-right rounded-lg px-2 py-1 focus:outline-none flex-shrink-0" />
      <span className="text-[10px] text-zinc-600 flex-shrink-0">/{grade.maxScore}</span>
      <button onClick={() => onDelete(grade._id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function MarksBreakdown({ subject, grades, onAdd, onUpdate, onDelete }) {
  const [aName, setAName] = useState('');
  const [aMax, setAMax] = useState(20);
  const midterms = grades.filter(g => g.examType === 'midterm').sort((a, b) => a.title.localeCompare(b.title));
  const termEnd = grades.find(g => g.examType === 'final');
  const assignments = grades.filter(g => g.examType === 'assignment');

  const quick = (type) => {
    const m = {
      midterm1: { title: 'Midterm 1', examType: 'midterm', maxScore: 10 },
      midterm2: { title: 'Midterm 2', examType: 'midterm', maxScore: 10 },
      termend: { title: 'Term End Exam', examType: 'final', maxScore: 100 },
    };
    onAdd({ ...m[type], score: 0, subject: subject._id });
  };

  const AddBtn = ({ label, onClick }) => (
    <button onClick={onClick} className="w-full text-xs text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-xl py-2 transition-colors flex items-center justify-center gap-1.5">
      <Plus size={11} />{label}
    </button>
  );

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 space-y-4">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Marks Breakdown</h3>

      <div className="space-y-1.5">
        <p className="text-[10px] text-zinc-700 font-semibold uppercase tracking-wide">Midterms</p>
        {midterms.map(g => <GradeRow key={g._id} grade={g} onUpdate={onUpdate} onDelete={onDelete} />)}
        {!midterms.some(m => m.title === 'Midterm 1') && <AddBtn label="Add Midterm 1" onClick={() => quick('midterm1')} />}
        {midterms.some(m => m.title === 'Midterm 1') && !midterms.some(m => m.title === 'Midterm 2') && <AddBtn label="Add Midterm 2" onClick={() => quick('midterm2')} />}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-zinc-700 font-semibold uppercase tracking-wide">Term End</p>
        {termEnd ? <GradeRow grade={termEnd} onUpdate={onUpdate} onDelete={onDelete} /> : <AddBtn label="Add Term End Exam" onClick={() => quick('termend')} />}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-zinc-700 font-semibold uppercase tracking-wide">Assignments</p>
        {assignments.map(g => <GradeRow key={g._id} grade={g} onUpdate={onUpdate} onDelete={onDelete} />)}
        <div className="flex gap-2 pt-1">
          <input type="text" placeholder="Assignment name" value={aName} onChange={e => setAName(e.target.value)}
            className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.07] text-zinc-200 placeholder-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/40" />
          <input type="number" placeholder="Max" value={aMax} onChange={e => setAMax(parseInt(e.target.value) || 0)}
            className="w-14 bg-white/[0.05] border border-white/[0.07] text-zinc-200 rounded-xl px-2 py-2 text-xs text-center focus:outline-none focus:border-violet-500/40 flex-shrink-0" />
          <button
            onClick={() => { if (aName.trim()) { onAdd({ title: aName.trim(), examType: 'assignment', score: 0, maxScore: aMax, subject: subject._id }); setAName(''); setAMax(20); } }}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors flex-shrink-0">
            <Plus size={13} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Todos({ subject, todos, onAdd, onUpdate, onDelete }) {
  const [text, setText] = useState('');
  const done = todos.filter(t => t.completed).length;
  const add = () => { if (text.trim()) { onAdd({ text: text.trim(), subject: subject._id }); setText(''); } };

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tasks</h3>
        <span className="text-xs text-zinc-700">{done}/{todos.length}</span>
      </div>
      <Bar value={done} max={todos.length || 1} color="#34d399" />
      <div className="flex gap-2">
        <input type="text" placeholder="Add task…" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.07] text-zinc-200 placeholder-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500/40" />
        <button onClick={add} className="px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors flex-shrink-0">
          <Plus size={13} className="text-white" />
        </button>
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
        {todos.length === 0 && <p className="text-[11px] text-zinc-700 text-center py-2">No tasks yet.</p>}
        {todos.map(t => (
          <div key={t._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] group">
            <button onClick={() => onUpdate(t._id, { completed: !t.completed })} className="text-zinc-600 hover:text-violet-400 transition-colors flex-shrink-0">
              {t.completed ? <CheckSquare size={14} className="text-emerald-400" /> : <Square size={14} />}
            </button>
            <p className={`flex-1 text-xs min-w-0 truncate ${t.completed ? 'line-through text-zinc-700' : 'text-zinc-300'}`}>{t.text}</p>
            <button onClick={() => onDelete(t._id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all flex-shrink-0">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mobile subject picker (horizontal scroll chips) ── */
function MobileSubjectPicker({ subjects, grades, selected, onSelect, onNavigate }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 custom-scrollbar" style={{ scrollbarHeight: 'none' }}>
      <button
        onClick={() => onSelect('overview')}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${selected === 'overview' ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30' : 'bg-white/[0.05] text-zinc-500 border border-white/[0.07] hover:text-zinc-200'}`}>
        <TrendingUp size={12} />Overview
      </button>
      {subjects.map(s => {
        const sg = grades.filter(g => g.subject._id === s._id);
        const max = sg.reduce((a, g) => a + g.maxScore, 0);
        const score = sg.reduce((a, g) => a + g.score, 0);
        const pct = max > 0 ? (score / max) * 100 : 0;
        const active = selected === s.name;
        return (
          <button key={s._id} onClick={() => onSelect(s.name)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${active ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30' : 'bg-white/[0.05] text-zinc-500 border border-white/[0.07] hover:text-zinc-200'}`}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pct >= 80 ? '#34d399' : pct > 0 ? '#fbbf24' : '#52525b' }} />
            {s.name}
          </button>
        );
      })}
      <button onClick={() => onNavigate('subjects')}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-zinc-700 border border-dashed border-white/[0.08] hover:text-zinc-400">
        <Plus size={11} />Subjects
      </button>
    </div>
  );
}

/* ── Desktop subject sidebar ── */
function DesktopSidebar({ subjects, grades, selected, onSelect, onNavigate }) {
  return (
    <div className="space-y-0.5">
      <button onClick={() => onSelect('overview')}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${selected === 'overview' ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'}`}>
        <TrendingUp size={14} />Overview
      </button>
      <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest px-3 pt-3 pb-1">Subjects</p>
      {subjects.map(s => {
        const sg = grades.filter(g => g.subject._id === s._id);
        const score = sg.reduce((a, g) => a + g.score, 0);
        const max = sg.reduce((a, g) => a + g.maxScore, 0);
        const pct = max > 0 ? (score / max) * 100 : 0;
        const active = selected === s.name;
        return (
          <button key={s._id} onClick={() => onSelect(s.name)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pct >= 80 ? '#34d399' : pct > 0 ? '#fbbf24' : '#3f3f46' }} />
              <span className="truncate text-sm font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <span className="text-xs opacity-50">{pct.toFixed(0)}%</span>
              <ChevronRight size={10} className="opacity-30" />
            </div>
          </button>
        );
      })}
      <button onClick={() => onNavigate('subjects')}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.04] transition-all border border-dashed border-white/[0.06] mt-2">
        <Plus size={12} />Manage Subjects
      </button>
    </div>
  );
}

function Overview({ subjects, grades, todos }) {
  const { pct, done, pending } = useMemo(() => {
    const score = grades.reduce((s, g) => s + g.score, 0);
    const max = grades.reduce((s, g) => s + g.maxScore, 0);
    const done = todos.filter(t => t.completed).length;
    return { pct: max > 0 ? (score / max) * 100 : 0, done, pending: todos.length - done };
  }, [grades, todos]);

  const subData = useMemo(() => subjects.map(s => {
    const sg = grades.filter(g => g.subject._id === s._id);
    const score = sg.reduce((a, g) => a + g.score, 0);
    const max = sg.reduce((a, g) => a + g.maxScore, 0);
    return { name: s.name, pct: max > 0 ? (score / max) * 100 : 0, score, max };
  }), [subjects, grades]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall Score', value: `${pct.toFixed(1)}%`, color: '#a78bfa' },
          { label: 'Subjects', value: subjects.length, color: '#60a5fa' },
          { label: 'Tasks Done', value: done, color: '#34d399' },
          { label: 'Pending', value: pending, color: '#fbbf24' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-center">
            <p className="text-[10px] text-zinc-600 mb-1 uppercase tracking-wide leading-none">{label}</p>
            <p className="text-xl font-black leading-tight mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Subject Performance</h3>
        {subData.length === 0 ? (
          <div className="flex items-center gap-2 text-zinc-700 text-sm py-3"><BookOpen size={16} />No marks recorded.</div>
        ) : (
          <div className="space-y-3">
            {subData.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-sm text-zinc-200 truncate">{s.name}</span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: s.pct >= 80 ? '#34d399' : s.pct >= 60 ? '#fbbf24' : '#f87171' }}>
                    {s.score}/{s.max} ({s.pct.toFixed(1)}%)
                  </span>
                </div>
                <Bar value={s.pct} color={s.pct >= 80 ? '#34d399' : s.pct >= 60 ? '#fbbf24' : '#f87171'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarksPage({ onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [todos, setTodos] = useState([]);
  const [selected, setSelected] = useState('overview');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [s, g, t] = await Promise.all([subjectsAPI.getAll(), gradesAPI.getAll(), todosAPI.getAll()]);
      setSubjects(s.data); setGrades(g.data); setTodos(t.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const gH = {
    addGrade: async d => { await gradesAPI.create(d); fetchData(); },
    updateGrade: async (id, d) => { setGrades(g => g.map(x => x._id === id ? { ...x, ...d } : x)); try { await gradesAPI.update(id, d); } catch { fetchData(); } },
    deleteGrade: async id => { await gradesAPI.delete(id); setGrades(g => g.filter(x => x._id !== id)); },
  };
  const tH = {
    addTodo: async d => { await todosAPI.create(d); fetchData(); },
    updateTodo: async (id, d) => { await todosAPI.update(id, d); fetchData(); },
    deleteTodo: async id => { await todosAPI.delete(id); setTodos(t => t.filter(x => x._id !== id)); },
  };

  const sub = subjects.find(s => s.name === selected);
  const subGrades = sub ? grades.filter(g => g.subject._id === sub._id) : [];
  const subTodos = sub ? todos.filter(t => t.subject === sub._id) : [];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-zinc-500 text-sm">Loading marks…</div>;

  const content = (
    <>
      {selected === 'overview' ? <Overview subjects={subjects} grades={grades} todos={todos} />
        : sub ? (
          <div className="space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
              <h2 className="text-lg font-black text-white">{sub.name}</h2>
              {(() => {
                const score = subGrades.reduce((s, g) => s + g.score, 0);
                const max = subGrades.reduce((s, g) => s + g.maxScore, 0);
                const pct = max > 0 ? (score / max) * 100 : 0;
                return <p className="text-sm text-zinc-500 mt-0.5">{score}/{max} marks <span className="font-bold ml-1" style={{ color: pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171' }}>({pct.toFixed(1)}%)</span></p>;
              })()}
            </div>
            <GoalCalc subject={sub} grades={subGrades} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <MarksBreakdown subject={sub} grades={subGrades} onAdd={gH.addGrade} onUpdate={gH.updateGrade} onDelete={gH.deleteGrade} />
              <Todos subject={sub} todos={subTodos} onAdd={tH.addTodo} onUpdate={tH.updateTodo} onDelete={tH.deleteTodo} />
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl py-16 flex flex-col items-center gap-3">
            <BookOpen size={22} className="text-zinc-700" />
            <p className="text-sm text-zinc-500">Select a subject.</p>
          </div>
        )}
    </>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Academic</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Marks</h1>
      </div>

      {/* Mobile: horizontal chip picker */}
      <div className="md:hidden">
        <MobileSubjectPicker subjects={subjects} grades={grades} selected={selected} onSelect={setSelected} onNavigate={onNavigate} />
        {content}
      </div>

      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex gap-5">
        <div className="w-52 flex-shrink-0 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3 self-start sticky top-6">
          <DesktopSidebar subjects={subjects} grades={grades} selected={selected} onSelect={setSelected} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 min-w-0">{content}</div>
      </div>
    </div>
  );
}

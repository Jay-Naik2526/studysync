import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Target, CheckSquare, Square, TrendingUp, BookOpen, ChevronRight } from 'lucide-react';
import { subjectsAPI, gradesAPI, todosAPI } from '../api';

function Bar({ value, max = 100, color = '#5B7C99' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-ink/10 rounded-full h-1.5">
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
    <div className="bg-parchment border border-sand rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h4 className="text-xs font-bold text-ink-muted uppercase tracking-widest flex items-center gap-1.5 flex-1 min-w-0">
          <Target size={12} className="text-ember-dark flex-shrink-0" />
          <span className="truncate">Goal calculator</span>
        </h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input type="number" value={target} onChange={e => setTarget(Number(e.target.value) || 0)}
            className="w-12 bg-white border border-sand text-ink text-xs font-bold text-center rounded-lg px-1.5 py-1 focus:outline-none focus:border-ember tabular-nums" />
          <span className="text-xs text-ink-muted">%</span>
        </div>
      </div>
      <div className={`rounded-lg px-4 py-3 text-center text-sm ${result.achieved ? 'bg-sage-pale text-sage-dark' : result.impossible ? 'bg-danger-pale text-danger' : result.done ? 'bg-map text-ink-muted' : 'bg-trail-pale'}`}>
        {result.done && <p>All marks entered.</p>}
        {result.achieved && <p>Already achieved {target}%!</p>}
        {result.impossible && <p>Not possible with remaining marks.</p>}
        {result.pct && (
          <>
            <p className="text-xs text-ink-muted mb-1">Need to score on remaining marks</p>
            <p className="text-3xl font-display font-bold text-ember-dark tabular-nums">{result.pct}%</p>
            <p className="text-xs text-ink-muted mt-1">({result.needed} of {result.remaining} marks)</p>
          </>
        )}
      </div>
    </div>
  );
}

function GradeRow({ grade, onUpdate, onDelete }) {
  return (
    <div className="flex items-center gap-2 bg-map rounded-xl px-3 py-2.5 border border-sand group">
      <span className="flex-1 text-xs text-ink truncate min-w-0">{grade.title}</span>
      <input type="number" value={grade.score}
        onChange={e => onUpdate(grade._id, { score: parseInt(e.target.value) || 0 })}
        className="w-12 bg-white border border-sand text-ink text-xs font-bold text-right rounded-lg px-2 py-1 focus:outline-none focus:border-ember flex-shrink-0 tabular-nums" />
      <span className="text-[10px] text-ink-muted flex-shrink-0">/{grade.maxScore}</span>
      <button onClick={() => onDelete(grade._id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-all flex-shrink-0">
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
    <button onClick={onClick} className="w-full text-xs font-bold text-ember-dark bg-ember-pale hover:bg-ember/20 rounded-xl py-2 transition-colors flex items-center justify-center gap-1.5">
      <Plus size={11} />{label}
    </button>
  );

  return (
    <div className="bg-parchment border border-sand rounded-xl p-4 space-y-4 shadow-sm">
      <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest">Marks breakdown</h3>

      <div className="space-y-1.5">
        <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wide">Midterms</p>
        {midterms.map(g => <GradeRow key={g._id} grade={g} onUpdate={onUpdate} onDelete={onDelete} />)}
        {!midterms.some(m => m.title === 'Midterm 1') && <AddBtn label="Add Midterm 1" onClick={() => quick('midterm1')} />}
        {midterms.some(m => m.title === 'Midterm 1') && !midterms.some(m => m.title === 'Midterm 2') && <AddBtn label="Add Midterm 2" onClick={() => quick('midterm2')} />}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wide">Term end</p>
        {termEnd ? <GradeRow grade={termEnd} onUpdate={onUpdate} onDelete={onDelete} /> : <AddBtn label="Add Term End Exam" onClick={() => quick('termend')} />}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-ink-faint font-bold uppercase tracking-wide">Assignments</p>
        {assignments.map(g => <GradeRow key={g._id} grade={g} onUpdate={onUpdate} onDelete={onDelete} />)}
        <div className="flex gap-2 pt-1">
          <input type="text" placeholder="Assignment name" value={aName} onChange={e => setAName(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-ember" />
          <input type="number" placeholder="Max" value={aMax} onChange={e => setAMax(parseInt(e.target.value) || 0)}
            className="w-14 bg-white border border-sand text-ink rounded-xl px-2 py-2 text-xs text-center focus:outline-none focus:border-ember flex-shrink-0 tabular-nums" />
          <button
            onClick={() => { if (aName.trim()) { onAdd({ title: aName.trim(), examType: 'assignment', score: 0, maxScore: aMax, subject: subject._id }); setAName(''); setAMax(20); } }}
            className="px-3 py-2 bg-ember hover:bg-ember-dark rounded-xl transition-colors flex-shrink-0">
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
    <div className="bg-parchment border border-sand rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest">Tasks</h3>
        <span className="text-xs text-ink-faint tabular-nums">{done}/{todos.length}</span>
      </div>
      <Bar value={done} max={todos.length || 1} color="#7C9070" />
      <div className="flex gap-2">
        <input type="text" placeholder="Add task…" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 min-w-0 bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-ember" />
        <button onClick={add} className="px-3 py-2 bg-ember hover:bg-ember-dark rounded-xl transition-colors flex-shrink-0">
          <Plus size={13} className="text-white" />
        </button>
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
        {todos.length === 0 && <p className="text-[11px] text-ink-faint text-center py-2">No tasks yet.</p>}
        {todos.map(t => (
          <div key={t._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-ink/[0.03] group">
            <button onClick={() => onUpdate(t._id, { completed: !t.completed })} className="text-ink-faint hover:text-ember-dark transition-colors flex-shrink-0">
              {t.completed ? <CheckSquare size={14} className="text-sage-dark" /> : <Square size={14} />}
            </button>
            <p className={`flex-1 text-xs min-w-0 truncate ${t.completed ? 'line-through text-ink-faint' : 'text-ink'}`}>{t.text}</p>
            <button onClick={() => onDelete(t._id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger transition-all flex-shrink-0">
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
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${selected === 'overview' ? 'bg-ember-pale text-ember-dark border border-ember/40' : 'bg-parchment text-ink-muted border border-sand hover:text-ink'}`}>
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
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${active ? 'bg-ember-pale text-ember-dark border border-ember/40' : 'bg-parchment text-ink-muted border border-sand hover:text-ink'}`}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pct >= 80 ? '#7C9070' : pct > 0 ? '#A8842C' : '#C9BD9C' }} />
            {s.name}
          </button>
        );
      })}
      <button onClick={() => onNavigate('subjects')}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-ink-faint border border-dashed border-sand-dark hover:text-ink-muted">
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
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selected === 'overview' ? 'bg-ember-pale text-ember-dark' : 'text-ink-muted hover:text-ink hover:bg-ink/[0.04]'}`}>
        <TrendingUp size={14} />Overview
      </button>
      <p className="text-[10px] text-ink-faint font-bold uppercase tracking-widest px-3 pt-3 pb-1">Subjects</p>
      {subjects.map(s => {
        const sg = grades.filter(g => g.subject._id === s._id);
        const score = sg.reduce((a, g) => a + g.score, 0);
        const max = sg.reduce((a, g) => a + g.maxScore, 0);
        const pct = max > 0 ? (score / max) * 100 : 0;
        const active = selected === s.name;
        return (
          <button key={s._id} onClick={() => onSelect(s.name)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'bg-ember-pale text-ember-dark' : 'text-ink-muted hover:text-ink hover:bg-ink/[0.04]'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pct >= 80 ? '#7C9070' : pct > 0 ? '#A8842C' : '#C9BD9C' }} />
              <span className="truncate text-sm font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <span className="text-xs opacity-60 tabular-nums">{pct.toFixed(0)}%</span>
              <ChevronRight size={10} className="opacity-40" />
            </div>
          </button>
        );
      })}
      <button onClick={() => onNavigate('subjects')}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-ink-faint hover:text-ink-muted hover:bg-ink/[0.04] transition-all border border-dashed border-sand-dark mt-2">
        <Plus size={12} />Manage subjects
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
          { label: 'Overall score', value: `${pct.toFixed(1)}%`, color: '#3E566C' },
          { label: 'Subjects', value: subjects.length, color: '#2B2B26' },
          { label: 'Tasks done', value: done, color: '#4A5A40' },
          { label: 'Pending', value: pending, color: '#A8842C' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-parchment border border-sand rounded-2xl p-4 text-center shadow-sm">
            <p className="text-[10px] text-ink-muted mb-1 uppercase tracking-wide leading-none">{label}</p>
            <p className="text-xl font-display font-bold leading-tight mt-1 tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">Subject performance</h3>
        {subData.length === 0 ? (
          <div className="flex items-center gap-2 text-ink-faint text-sm py-3"><BookOpen size={16} />No marks recorded.</div>
        ) : (
          <div className="space-y-3">
            {subData.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-sm text-ink truncate">{s.name}</span>
                  <span className="text-xs font-bold flex-shrink-0 tabular-nums" style={{ color: s.pct >= 80 ? '#4A5A40' : s.pct >= 60 ? '#A8842C' : '#A93B2B' }}>
                    {s.score}/{s.max} ({s.pct.toFixed(1)}%)
                  </span>
                </div>
                <Bar value={s.pct} color={s.pct >= 80 ? '#7C9070' : s.pct >= 60 ? '#A8842C' : '#A93B2B'} />
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

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-ink-muted text-sm">Loading marks…</div>;

  const content = (
    <>
      {selected === 'overview' ? <Overview subjects={subjects} grades={grades} todos={todos} />
        : sub ? (
          <div className="space-y-4">
            <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-display font-bold text-ink">{sub.name}</h2>
              {(() => {
                const score = subGrades.reduce((s, g) => s + g.score, 0);
                const max = subGrades.reduce((s, g) => s + g.maxScore, 0);
                const pct = max > 0 ? (score / max) * 100 : 0;
                return <p className="text-sm text-ink-muted mt-0.5 tabular-nums">{score}/{max} marks <span className="font-bold ml-1" style={{ color: pct >= 80 ? '#4A5A40' : pct >= 60 ? '#A8842C' : '#A93B2B' }}>({pct.toFixed(1)}%)</span></p>;
              })()}
            </div>
            <GoalCalc subject={sub} grades={subGrades} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <MarksBreakdown subject={sub} grades={subGrades} onAdd={gH.addGrade} onUpdate={gH.updateGrade} onDelete={gH.deleteGrade} />
              <Todos subject={sub} todos={subTodos} onAdd={tH.addTodo} onUpdate={tH.updateTodo} onDelete={tH.deleteTodo} />
            </div>
          </div>
        ) : (
          <div className="bg-parchment border border-sand rounded-2xl py-16 flex flex-col items-center gap-3 shadow-sm">
            <BookOpen size={22} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">Select a subject.</p>
          </div>
        )}
    </>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Elevation gained</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">Marks</h1>
      </div>

      {/* Mobile: horizontal chip picker */}
      <div className="md:hidden">
        <MobileSubjectPicker subjects={subjects} grades={grades} selected={selected} onSelect={setSelected} onNavigate={onNavigate} />
        {content}
      </div>

      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex gap-5">
        <div className="w-52 flex-shrink-0 bg-parchment border border-sand rounded-2xl p-3 self-start sticky top-6 shadow-sm">
          <DesktopSidebar subjects={subjects} grades={grades} selected={selected} onSelect={setSelected} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 min-w-0">{content}</div>
      </div>
    </div>
  );
}

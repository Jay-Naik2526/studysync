import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Download, FileText, BookOpen, Brain,
  ClipboardList, HelpCircle, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, CheckCircle, XCircle, Trophy, Eye, EyeOff
} from 'lucide-react';
import { notesAPI, subjectsAPI } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';

/* ─────────────────────────── helpers ─────────────────────────── */

const typeOptions = [
  { value: 'detailed',   label: 'Detailed Notes',  icon: BookOpen },
  { value: 'short',      label: 'Quick Revision',  icon: Brain },
  { value: 'flashcards', label: 'Flashcards',       icon: ClipboardList },
  { value: 'quiz',       label: 'Practice Quiz',   icon: HelpCircle },
];

const MarkdownRenderer = React.memo(({ content, isPrint = false }) => (
  <div className={isPrint ? 'prose prose-slate max-w-none bg-white p-10' : 'markdown-dark'}>
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'html' }]]}
    >
      {content}
    </ReactMarkdown>
  </div>
));

/* ─────────────────────────── Flashcards ─────────────────────────── */

function FlashcardView({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [known, setKnown] = useState(new Set());

  const card = cards[index];
  const pct = Math.round(((index) / cards.length) * 100);
  const knownCount = known.size;

  const go = useCallback((dir) => {
    setFlipped(false);
    setShowHint(false);
    setTimeout(() => setIndex(i => Math.max(0, Math.min(cards.length - 1, i + dir))), 150);
  }, [cards.length]);

  const markKnown = () => {
    setKnown(s => { const n = new Set(s); n.add(index); return n; });
    if (index < cards.length - 1) go(1);
  };

  const markAgain = () => {
    setKnown(s => { const n = new Set(s); n.delete(index); return n; });
    if (index < cards.length - 1) go(1);
  };

  const restart = () => {
    setIndex(0); setFlipped(false); setShowHint(false); setKnown(new Set());
  };

  const allDone = index === cards.length - 1 && (known.size + (cards.length - known.size) === cards.length);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Progress bar + counter */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span className="font-semibold">{index + 1} <span className="text-zinc-700">/ {cards.length}</span></span>
          <span className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-emerald-400 font-semibold">{knownCount} known</span>
            <span className="text-zinc-700 mx-1">·</span>
            <span className="text-zinc-500">{cards.length - knownCount} left</span>
          </span>
        </div>
        <div className="w-full bg-white/[0.05] rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
        </div>
      </div>

      {/* The card */}
      <div
        className="flip-card w-full cursor-pointer select-none"
        style={{ height: 280 }}
        onClick={() => setFlipped(f => !f)}
      >
        <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flip-card-front absolute inset-0 bg-white/[0.05] border border-white/[0.10] rounded-2xl p-7 flex flex-col justify-between hover:border-violet-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Question</span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <RotateCcw size={10} /> tap to flip
              </span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed flex-1 flex items-center">
              {card.question}
            </p>
            {card.hint && (
              <div className="mt-3">
                <button
                  onClick={e => { e.stopPropagation(); setShowHint(v => !v); }}
                  className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showHint ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showHint ? `Hint: ${card.hint}` : 'Show hint'}
                </button>
              </div>
            )}
            {/* Corner badge */}
            {known.has(index) && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={14} className="text-emerald-400" />
              </div>
            )}
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 border border-violet-500/20 rounded-2xl p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest">Answer</span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <RotateCcw size={10} /> tap to flip back
              </span>
            </div>
            <p className="text-base sm:text-lg text-zinc-100 leading-relaxed flex-1 flex items-center">
              {card.answer}
            </p>
            {/* Know it / Study more */}
            <div className="flex gap-3 mt-4" onClick={e => e.stopPropagation()}>
              <button onClick={markAgain}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors">
                <XCircle size={15} /> Study more
              </button>
              <button onClick={markKnown}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors">
                <CheckCircle size={15} /> Got it!
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-4 mt-6">
        <button onClick={() => go(-1)} disabled={index === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={16} /> Prev
        </button>

        <button onClick={() => setFlipped(f => !f)}
          className="px-5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/25 text-violet-300 text-sm font-semibold hover:bg-violet-600/30 transition-all flex items-center gap-2">
          <RotateCcw size={14} /> Flip
        </button>

        <button onClick={() => go(1)} disabled={index === cards.length - 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Restart + dots */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5 max-w-xs">
        {cards.map((_, i) => (
          <button key={i} onClick={() => { setIndex(i); setFlipped(false); setShowHint(false); }}
            className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-violet-400 scale-125' : known.has(i) ? 'bg-emerald-500' : 'bg-white/[0.12]'}`} />
        ))}
      </div>

      {knownCount === cards.length && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Trophy size={18} /> All {cards.length} cards mastered!
          </div>
          <button onClick={restart} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
            <RotateCcw size={12} /> Reset deck
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Quiz ─────────────────────────── */

function QuizView({ questions }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // selected option text
  const [answers, setAnswers] = useState([]); // { correct: bool } per question
  const [done, setDone] = useState(false);

  const q = questions[index];
  const answered = selected !== null;
  const isCorrect = answered && selected === q.correctAnswer;
  const score = answers.filter(a => a.correct).length;

  const choose = (opt) => {
    if (answered) return;
    setSelected(opt);
  };

  const next = () => {
    const result = { correct: selected === q.correctAnswer };
    const newAnswers = [...answers, result];
    setAnswers(newAnswers);

    if (index < questions.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  const restart = () => {
    setIndex(0); setSelected(null); setAnswers([]); setDone(false);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? { label: 'Excellent', color: '#34d399', icon: '🏆' }
      : pct >= 70 ? { label: 'Good', color: '#a78bfa', icon: '🎯' }
      : pct >= 50 ? { label: 'Keep Practicing', color: '#fbbf24', icon: '📚' }
      : { label: 'Needs Work', color: '#f87171', icon: '💪' };

    return (
      <div className="flex flex-col items-center w-full max-w-lg mx-auto py-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center text-4xl mb-5">
          {grade.icon}
        </div>
        <h3 className="text-2xl font-black text-white mb-1">Quiz Complete!</h3>
        <p className="text-zinc-500 text-sm mb-7">Here's how you did</p>

        {/* Score ring */}
        <div className="relative mb-7">
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
            <circle cx={60} cy={60} r={50} fill="none" stroke={grade.color} strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`}
              style={{ strokeDashoffset: 2 * Math.PI * 50 - (pct / 100) * 2 * Math.PI * 50, transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white">{pct}%</span>
            <span className="text-xs text-zinc-500 mt-0.5">{score}/{questions.length}</span>
          </div>
        </div>

        <p className="font-bold text-base mb-6" style={{ color: grade.color }}>{grade.label}</p>

        {/* Per-question breakdown */}
        <div className="w-full space-y-2 mb-7">
          {questions.map((q, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${answers[i]?.correct ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
              {answers[i]?.correct
                ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-xs text-zinc-300 font-medium leading-snug truncate">{q.question}</p>
                {!answers[i]?.correct && (
                  <p className="text-[10px] text-emerald-400 mt-0.5">✓ {q.correctAnswer}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={restart}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-500/20">
          <RotateCcw size={14} /> Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
        <span className="font-semibold">Q{index + 1} <span className="text-zinc-700">/ {questions.length}</span></span>
        <span className="flex items-center gap-3">
          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> {score} correct</span>
          <span className="text-red-400 flex items-center gap-1"><XCircle size={11} /> {answers.length - score} wrong</span>
        </span>
      </div>
      <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-6">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${((index) / questions.length) * 100}%` }} />
      </div>

      {/* Question card */}
      <div className="bg-white/[0.04] border border-white/[0.09] rounded-2xl p-5 sm:p-6 mb-4">
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-3">Question {index + 1}</p>
        <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-5">
        {q.options.map((opt, i) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === q.correctAnswer;
          let style = 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:border-violet-500/40 hover:bg-white/[0.07]';
          if (answered) {
            if (isCorrectOpt) style = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
            else if (isSelected) style = 'bg-red-500/10 border-red-500/40 text-red-300';
            else style = 'bg-white/[0.02] border-white/[0.04] text-zinc-600';
          }

          return (
            <button
              key={i}
              onClick={() => choose(opt)}
              disabled={answered}
              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${style} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 transition-colors
                ${answered && isCorrectOpt ? 'bg-emerald-500/25 text-emerald-400'
                  : answered && isSelected ? 'bg-red-500/25 text-red-400'
                  : 'bg-white/[0.06] text-zinc-500'}`}>
                {answered && isCorrectOpt ? <CheckCircle size={13} />
                  : answered && isSelected ? <XCircle size={13} />
                  : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 leading-snug">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation (shown after answering) */}
      {answered && q.explanation && (
        <div className={`rounded-xl border px-4 py-3.5 mb-5 ${isCorrect ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-zinc-500">Explanation</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Next */}
      {answered && (
        <button onClick={next}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20">
          {index < questions.length - 1 ? <><span>Next Question</span><ChevronRight size={15} /></> : <><Trophy size={15} /><span>See Results</span></>}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────── Main page ─────────────────────────── */

export default function NotesPage() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSub, setSelectedSub] = useState('');
  const [noteType, setNoteType] = useState('detailed');
  const [currentNote, setCurrentNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    subjectsAPI.getAll().then(r => setSubjects(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    let iv;
    if (loading) {
      setProgress(0);
      iv = setInterval(() => setProgress(p => p < 88 ? p + Math.random() * 5 : p), 700);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 600);
    }
    return () => clearInterval(iv);
  }, [loading]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true); setCurrentNote(null);
    try {
      const res = await notesAPI.generate(new FormData(e.target));
      setCurrentNote(res.data);
      setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Generation failed. Try again.');
    }
    setLoading(false);
  };

  const downloadPDF = () => {
    html2pdf().set({
      margin: [10, 10],
      filename: `${currentNote.title}_StudySync.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(document.getElementById('printable-pdf-content')).save();
  };

  const isInteractive = currentNote?.type === 'flashcards' || currentNote?.type === 'quiz';
  const TypeIcon = typeOptions.find(t => t.value === noteType)?.icon || BookOpen;

  const FormPanel = (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
          <Sparkles size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-bold text-white">Generate</h2>
      </div>

      <form onSubmit={handleGenerate} className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Subject</label>
          <div className="relative">
            <select name="subjectId" onChange={e => setSelectedSub(e.target.value)} required
              className="w-full bg-white/[0.05] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 appearance-none transition-all">
              <option value="">Select subject…</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Topic</label>
          <input name="title" placeholder="e.g. Binary Search Trees" required
            className="w-full bg-white/[0.05] border border-white/[0.08] text-zinc-200 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button type="button" key={value} onClick={() => setNoteType(value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${noteType === value ? 'bg-violet-600/25 border-violet-500/40 text-violet-300' : 'bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'}`}>
                <Icon size={13} className="flex-shrink-0" /><span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={noteType} />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">
            Context <span className="normal-case font-normal text-zinc-700">(optional)</span>
          </label>
          <textarea name="description" placeholder="Syllabus, keywords, or context…"
            className="w-full bg-white/[0.05] border border-white/[0.08] text-zinc-200 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 h-20 resize-none transition-all" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">
            Files <span className="normal-case font-normal text-zinc-700">(optional)</span>
          </label>
          <input type="file" name="files" multiple
            className="block w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600/15 file:text-violet-400 file:font-medium file:cursor-pointer hover:file:bg-violet-600/25" />
        </div>

        {loading && (
          <div className="space-y-1.5">
            <div className="w-full bg-white/[0.05] rounded-full h-0.5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-zinc-600 text-center">Generating with AI…</p>
          </div>
        )}

        <button type="submit" disabled={loading || !selectedSub}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20">
          <Sparkles size={14} />
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>
    </div>
  );

  const OutputPanel = (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col"
      style={{ height: 'clamp(400px, calc(100vh - 180px), 900px)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] flex-shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setShowForm(true)} className="lg:hidden text-zinc-600 hover:text-zinc-300 text-xs font-medium transition-colors mr-1 flex-shrink-0">← Form</button>
          <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest truncate">Output</span>
          {currentNote && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
              currentNote.type === 'flashcards' ? 'bg-violet-500/15 text-violet-400'
              : currentNote.type === 'quiz' ? 'bg-amber-500/15 text-amber-400'
              : 'bg-zinc-500/15 text-zinc-400'}`}>
              {typeOptions.find(t => t.value === currentNote.type)?.label}
            </span>
          )}
        </div>
        {currentNote && !isInteractive && (
          <button onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-[11px] font-semibold text-white transition-all shadow-md shadow-violet-500/20 flex-shrink-0 whitespace-nowrap">
            <Download size={11} />PDF
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7">
        {currentNote ? (
          <div>
            {/* Title for notes only */}
            {!isInteractive && (
              <div className="flex items-start gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TypeIcon size={14} className="text-violet-400" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">{currentNote.title}</h2>
              </div>
            )}

            {currentNote.type === 'detailed' || currentNote.type === 'short'
              ? <MarkdownRenderer content={currentNote.content} />
              : currentNote.type === 'flashcards'
                ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-base font-black text-white">{currentNote.title}</h2>
                        <p className="text-xs text-zinc-600 mt-0.5">{currentNote.content.length} cards · tap a card to flip</p>
                      </div>
                    </div>
                    <FlashcardView cards={currentNote.content} />
                  </div>
                )
                : (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-base font-black text-white">{currentNote.title}</h2>
                      <p className="text-xs text-zinc-600 mt-0.5">{currentNote.content.length} questions</p>
                    </div>
                    <QuizView questions={currentNote.content} />
                  </div>
                )
            }
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/15 to-fuchsia-600/15 border border-violet-500/15 flex items-center justify-center mb-4">
              <Sparkles size={20} className="text-violet-500/50" />
            </div>
            <p className="text-sm font-semibold text-zinc-500">Ready to generate</p>
            <p className="text-xs text-zinc-700 mt-1.5 max-w-[220px]">Choose a subject and topic, then hit Generate.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Hidden PDF element */}
      <div className="hidden">
        <div id="printable-pdf-content" style={{ width: '750px', background: 'white', color: 'black' }}>
          <div style={{ padding: '40px', borderBottom: '3px solid #7c3aed' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1e1b4b', margin: 0 }}>{currentNote?.title}</h1>
            <p style={{ color: '#9ca3af', marginTop: '6px', fontSize: '13px' }}>StudySync AI Notes</p>
          </div>
          <div style={{ padding: '40px' }}>
            {currentNote && (currentNote.type === 'detailed' || currentNote.type === 'short') && (
              <MarkdownRenderer content={currentNote.content} isPrint />
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">AI-Powered</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Study Notes</h1>
      </div>

      {/* Mobile toggle */}
      <div className="lg:hidden space-y-4">
        <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 gap-1">
          <button onClick={() => setShowForm(true)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${showForm ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Generate
          </button>
          <button onClick={() => setShowForm(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!showForm ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            Output {currentNote && <span className="text-violet-400 ml-1">●</span>}
          </button>
        </div>
        {showForm ? FormPanel : OutputPanel}
      </div>

      {/* Desktop side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 self-start sticky top-6">{FormPanel}</div>
        <div className="lg:col-span-8">
          {OutputPanel}
        </div>
      </div>
    </div>
  );
}

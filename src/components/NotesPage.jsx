import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass, Download, FileText, BookOpen, Brain,
  ClipboardList, HelpCircle, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, CheckCircle, XCircle, Trophy, Eye, EyeOff, MessageSquare, Send, Loader2,
  Target, AlertTriangle
} from 'lucide-react';
import { notesAPI, subjectsAPI } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';
import { SkeletonNotes } from './SkeletonLoader';

/* ─────────────────────────── helpers ─────────────────────────── */

const typeOptions = [
  { value: 'detailed',   label: 'Detailed Notes',  icon: BookOpen },
  { value: 'short',      label: 'Quick Revision',  icon: Brain },
  { value: 'flashcards', label: 'Flashcards',       icon: ClipboardList },
  { value: 'quiz',       label: 'Practice Quiz',   icon: HelpCircle },
];

function preprocessMarkdown(content) {
  if (!content) return '';

  let processed = content;

  // Ensure block equations ($$) have newlines before and after them
  processed = processed.replace(/(?<!\n)\$\$/g, '\n$$');
  processed = processed.replace(/\$\$(?!\n)/g, '$$\n');

  return processed;
}

function MarkdownRenderer({ content, isPrint = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    // KaTeX renders error spans with a `title` attribute that creates browser tooltips.
    // Strip them so no error popup appears — the math just renders as-is.
    ref.current.querySelectorAll('.katex-error').forEach(el => {
      el.removeAttribute('title');
    });
  }, [content]);

  const sanitizedContent = preprocessMarkdown(content);

  return (
    <div ref={ref} className={isPrint ? 'prose prose-slate max-w-none bg-white p-10' : 'markdown-atlas'}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'html' }]]}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}

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
        <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
          <span className="font-bold tabular-nums">{index + 1} <span className="text-ink-faint">/ {cards.length}</span></span>
          <span className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-sage-dark" />
            <span className="text-sage-dark font-bold tabular-nums">{knownCount} known</span>
            <span className="text-ink-faint mx-1">·</span>
            <span className="text-ink-muted tabular-nums">{cards.length - knownCount} left</span>
          </span>
        </div>
        <div className="w-full bg-ink/10 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-ember transition-all duration-500"
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
          <div className="flip-card-front absolute inset-0 bg-parchment border border-sand rounded-2xl p-7 flex flex-col justify-between hover:border-ember/40 transition-colors shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-ember-dark uppercase tracking-widest">Question</span>
              <span className="text-[10px] text-ink-faint flex items-center gap-1">
                <RotateCcw size={10} /> tap to flip
              </span>
            </div>
            <p className="text-lg sm:text-xl font-display font-bold text-ink leading-relaxed flex-1 flex items-center">
              {card.question}
            </p>
            {card.hint && (
              <div className="mt-3">
                <button
                  onClick={e => { e.stopPropagation(); setShowHint(v => !v); }}
                  className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  {showHint ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showHint ? `Hint: ${card.hint}` : 'Show hint'}
                </button>
              </div>
            )}
            {/* Corner badge */}
            {known.has(index) && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-sage-pale flex items-center justify-center">
                <CheckCircle size={14} className="text-sage-dark" />
              </div>
            )}
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 bg-sage-pale border border-sage/40 rounded-2xl p-7 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-sage-dark uppercase tracking-widest">Answer</span>
              <span className="text-[10px] text-ink-faint flex items-center gap-1">
                <RotateCcw size={10} /> tap to flip back
              </span>
            </div>
            <p className="text-base sm:text-lg text-ink leading-relaxed flex-1 flex items-center">
              {card.answer}
            </p>
            {/* Know it / Study more */}
            <div className="flex gap-3 mt-4" onClick={e => e.stopPropagation()}>
              <button onClick={markAgain}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger-pale border border-danger/25 text-danger text-sm font-bold hover:border-danger/50 transition-colors">
                <XCircle size={15} /> Study more
              </button>
              <button onClick={markKnown}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-sage/40 text-sage-dark text-sm font-bold hover:border-sage transition-colors">
                <CheckCircle size={15} /> Got it!
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-4 mt-6">
        <button onClick={() => go(-1)} disabled={index === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-parchment border border-sand text-ink-muted text-sm font-medium hover:border-sand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={16} /> Prev
        </button>

        <button onClick={() => setFlipped(f => !f)}
          className="px-5 py-2.5 rounded-xl bg-ember-pale border border-ember/30 text-ember-dark text-sm font-bold hover:border-ember/60 transition-all flex items-center gap-2">
          <RotateCcw size={14} /> Flip
        </button>

        <button onClick={() => go(1)} disabled={index === cards.length - 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-parchment border border-sand text-ink-muted text-sm font-medium hover:border-sand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Restart + dots */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5 max-w-xs">
        {cards.map((_, i) => (
          <button key={i} onClick={() => { setIndex(i); setFlipped(false); setShowHint(false); }}
            className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-ember scale-125' : known.has(i) ? 'bg-sage' : 'bg-ink/15'}`} />
        ))}
      </div>

      {knownCount === cards.length && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sage-dark font-bold text-sm">
            <Trophy size={18} /> All {cards.length} cards mastered!
          </div>
          <button onClick={restart} className="text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1">
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
    const grade = pct >= 90 ? { label: 'Summit reached', color: '#4A5A40', Icon: Trophy }
      : pct >= 70 ? { label: 'Good climb', color: '#3E566C', Icon: Target }
      : pct >= 50 ? { label: 'Keep practicing', color: '#A8842C', Icon: BookOpen }
      : { label: 'Needs work', color: '#A93B2B', Icon: AlertTriangle };

    return (
      <div className="flex flex-col items-center w-full max-w-lg mx-auto py-8">
        <div className="w-20 h-20 rounded-2xl bg-parchment border border-sand flex items-center justify-center mb-5 shadow-sm">
          <grade.Icon size={32} style={{ color: grade.color }} />
        </div>
        <h3 className="text-2xl font-display font-bold text-ink mb-1">Quiz complete!</h3>
        <p className="text-ink-muted text-sm mb-7">Here's how you did</p>

        {/* Score ring */}
        <div className="relative mb-7">
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(43,43,38,0.08)" strokeWidth={10} />
            <circle cx={60} cy={60} r={50} fill="none" stroke={grade.color} strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`}
              style={{ strokeDashoffset: 2 * Math.PI * 50 - (pct / 100) * 2 * Math.PI * 50, transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-bold text-ink tabular-nums">{pct}%</span>
            <span className="text-xs text-ink-muted mt-0.5 tabular-nums">{score}/{questions.length}</span>
          </div>
        </div>

        <p className="font-display font-bold text-base mb-6" style={{ color: grade.color }}>{grade.label}</p>

        {/* Per-question breakdown */}
        <div className="w-full space-y-2 mb-7">
          {questions.map((q, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${answers[i]?.correct ? 'bg-sage-pale border-sage/30' : 'bg-danger-pale border-danger/25'}`}>
              {answers[i]?.correct
                ? <CheckCircle size={16} className="text-sage-dark flex-shrink-0 mt-0.5" />
                : <XCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-xs text-ink font-medium leading-snug truncate">{q.question}</p>
                {!answers[i]?.correct && (
                  <p className="text-[10px] text-sage-dark mt-0.5">✓ {q.correctAnswer}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={restart}
          className="flex items-center gap-2 px-6 py-3 bg-ember hover:bg-ember-dark text-white font-bold rounded-xl text-sm transition-all shadow-sm">
          <RotateCcw size={14} /> Retake quiz
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
        <span className="font-bold tabular-nums">Q{index + 1} <span className="text-ink-faint">/ {questions.length}</span></span>
        <span className="flex items-center gap-3">
          <span className="text-sage-dark flex items-center gap-1 tabular-nums"><CheckCircle size={11} /> {score} correct</span>
          <span className="text-danger flex items-center gap-1 tabular-nums"><XCircle size={11} /> {answers.length - score} wrong</span>
        </span>
      </div>
      <div className="w-full bg-ink/10 rounded-full h-1.5 mb-6">
        <div className="h-1.5 rounded-full bg-ember transition-all duration-500"
          style={{ width: `${((index) / questions.length) * 100}%` }} />
      </div>

      {/* Question card */}
      <div className="bg-parchment border border-sand rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-3">Question {index + 1}</p>
        <p className="text-base sm:text-lg font-display font-bold text-ink leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-5">
        {q.options.map((opt, i) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === q.correctAnswer;
          let style = 'bg-parchment border-sand text-ink hover:border-ember/50 hover:bg-white/60';
          if (answered) {
            if (isCorrectOpt) style = 'bg-sage-pale border-sage/50 text-sage-dark';
            else if (isSelected) style = 'bg-danger-pale border-danger/40 text-danger';
            else style = 'bg-map border-sand text-ink-faint';
          }

          return (
            <button
              key={i}
              onClick={() => choose(opt)}
              disabled={answered}
              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium text-left transition-all ${style} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors
                ${answered && isCorrectOpt ? 'bg-sage/25 text-sage-dark'
                  : answered && isSelected ? 'bg-danger/20 text-danger'
                  : 'bg-ink/5 text-ink-muted'}`}>
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
        <div className={`rounded-xl border px-4 py-3.5 mb-5 ${isCorrect ? 'bg-sage-pale border-sage/30' : 'bg-caution-pale border-caution/30'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-ink-muted">Explanation</p>
          <p className="text-sm text-ink leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Next */}
      {answered && (
        <button onClick={next}
          className="w-full py-3 bg-ember hover:bg-ember-dark text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm">
          {index < questions.length - 1 ? <><span>Next question</span><ChevronRight size={15} /></> : <><Trophy size={15} /><span>See results</span></>}
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

  // Chatbot Q&A States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage.trim();
    setChatMessage('');
    setChatLoading(true);

    const updatedHistory = [...chatHistory, { sender: 'user', text: userMsg }];
    setChatHistory(updatedHistory);

    try {
      const res = await notesAPI.chatAboutNote({
        noteContent: currentNote.content,
        chatHistory: chatHistory,
        message: userMsg
      });

      setChatHistory([...updatedHistory, { sender: 'ai', text: res.data.response }]);
    } catch (err) {
      alert(err.response?.data?.message || 'AI Chatbot failed to respond. Try again.');
    }
    setChatLoading(false);
  };

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
    <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-ember flex items-center justify-center">
          <Compass size={13} className="text-white" />
        </div>
        <h2 className="text-sm font-display font-bold text-ink">Generate</h2>
      </div>

      <form onSubmit={handleGenerate} className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Subject</label>
          <div className="relative">
            <select name="subjectId" onChange={e => setSelectedSub(e.target.value)} required
              className="w-full bg-white border border-sand text-ink rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember appearance-none transition-all">
              <option value="">Select subject…</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Topic</label>
          <input name="title" placeholder="e.g. Binary Search Trees" required
            className="w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember transition-all" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button type="button" key={value} onClick={() => setNoteType(value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${noteType === value ? 'bg-ember-pale border-ember/40 text-ember-dark' : 'bg-white border-sand text-ink-muted hover:text-ink hover:border-sand-dark'}`}>
                <Icon size={13} className="flex-shrink-0" /><span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={noteType} />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">
            Context <span className="normal-case font-normal text-ink-faint">(optional)</span>
          </label>
          <textarea name="description" placeholder="Syllabus, keywords, or context…"
            className="w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember h-20 resize-none transition-all" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">
            Files <span className="normal-case font-normal text-ink-faint">(optional)</span>
          </label>
          <input type="file" name="files" multiple
            className="block w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-ember-pale file:text-ember-dark file:font-bold file:cursor-pointer hover:file:bg-ember/20" />
        </div>

        {loading && (
          <div className="space-y-1.5">
            <div className="w-full bg-ink/10 rounded-full h-0.5 overflow-hidden">
              <div className="h-full rounded-full bg-ember transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-ink-muted text-center">Generating…</p>
          </div>
        )}

        <button type="submit" disabled={loading || !selectedSub}
          className="w-full py-3 bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm">
          <Compass size={14} />
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>
    </div>
  );

  const OutputPanel = (
    <div className="relative bg-parchment border border-sand rounded-2xl flex flex-col shadow-sm"
      style={{ height: 'clamp(400px, calc(100vh - 180px), 900px)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand flex-shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setShowForm(true)} className="lg:hidden text-ink-muted hover:text-ink text-xs font-medium transition-colors mr-1 flex-shrink-0">← Form</button>
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest truncate">Output</span>
          {currentNote && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              currentNote.type === 'flashcards' ? 'bg-ember-pale text-ember-dark'
              : currentNote.type === 'quiz' ? 'bg-caution-pale text-caution'
              : 'bg-map text-ink-muted'}`}>
              {typeOptions.find(t => t.value === currentNote.type)?.label}
            </span>
          )}
        </div>
        {currentNote && !isInteractive && (
          <button onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ember hover:bg-ember-dark rounded-lg text-[11px] font-bold text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap">
            <Download size={11} />PDF
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7">
        {loading ? (
          <SkeletonNotes />
        ) : currentNote ? (
          <div>
            {/* Title for notes only */}
            {!isInteractive && (
              <div className="flex items-start gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-ember-pale border border-ember/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TypeIcon size={14} className="text-ember-dark" />
                </div>
                <h2 className="text-base sm:text-lg font-display font-bold text-ink leading-tight">{currentNote.title}</h2>
              </div>
            )}

            {currentNote.type === 'detailed' || currentNote.type === 'short'
              ? <MarkdownRenderer content={currentNote.content} />
              : currentNote.type === 'flashcards'
                ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-base font-display font-bold text-ink">{currentNote.title}</h2>
                        <p className="text-xs text-ink-muted mt-0.5">{currentNote.content.length} cards · tap a card to flip</p>
                      </div>
                    </div>
                    <FlashcardView cards={currentNote.content} />
                  </div>
                )
                : (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-base font-display font-bold text-ink">{currentNote.title}</h2>
                      <p className="text-xs text-ink-muted mt-0.5">{currentNote.content.length} questions</p>
                    </div>
                    <QuizView questions={currentNote.content} />
                  </div>
                )
            }
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-map border border-sand flex items-center justify-center mb-4">
              <Compass size={20} className="text-ink-faint" />
            </div>
            <p className="text-sm font-bold text-ink-muted">Ready to generate</p>
            <p className="text-xs text-ink-faint mt-1.5 max-w-[220px]">Choose a subject and topic, then hit Generate.</p>
          </div>
        )}
      </div>

      {/* Floating Basecamp chat overlay inside the OutputPanel */}
      {currentNote && !isInteractive && (
        <>
          {/* Chat toggle button */}
          <div className="absolute bottom-5 right-5 z-40">
            <button
              onClick={() => setChatOpen(prev => !prev)}
              aria-label="Ask Basecamp"
              className={`w-12 h-12 rounded-full text-white shadow-md flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95
                ${chatOpen
                  ? 'bg-ink hover:bg-ink/80 rotate-90'
                  : 'bg-ember hover:bg-ember-dark'
                }`}
            >
              {chatOpen ? <XCircle size={20} /> : <MessageSquare size={18} />}
            </button>
          </div>

          {/* Floating Slide-in chat window */}
          {chatOpen && (
            <div className="absolute bottom-20 right-5 w-80 sm:w-[380px] h-[450px] rounded-2xl bg-parchment border border-sand shadow-xl flex flex-col z-50 overflow-hidden transition-all duration-300">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-sand bg-map flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass size={14} className="text-ember-dark" />
                  <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Basecamp</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-ink-muted hover:text-ink text-xs">Close</button>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-ink-muted text-xs mt-20 space-y-2.5">
                    <Brain size={24} className="mx-auto text-ink-faint" />
                    <p>Ask me anything about these study notes!</p>
                  </div>
                ) : (
                  chatHistory.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-ember text-white rounded-br-none'
                          : 'bg-white border border-sand text-ink rounded-bl-none markdown-atlas'
                      }`}>
                        {m.sender === 'user' ? m.text : <ReactMarkdown>{m.text}</ReactMarkdown>}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-sand text-ink-muted rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin text-ember-dark" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-sand bg-map flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  placeholder="Ask a question..."
                  required
                  disabled={chatLoading}
                  className="flex-1 bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-ember transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="p-2 bg-ember hover:bg-ember-dark rounded-xl text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Hidden PDF element */}
      <div className="hidden">
        <div id="printable-pdf-content" style={{ width: '750px', background: 'white', color: 'black' }}>
          <div style={{ padding: '40px', borderBottom: '3px solid #E76F51' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#2B2B26', margin: 0 }}>{currentNote?.title}</h1>
            <p style={{ color: '#7A7566', marginTop: '6px', fontSize: '13px' }}>StudySync study notes</p>
          </div>
          <div style={{ padding: '40px' }}>
            {currentNote && (currentNote.type === 'detailed' || currentNote.type === 'short') && (
              <MarkdownRenderer content={currentNote.content} isPrint />
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Field notes</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">Study notes</h1>
      </div>

      {/* Mobile toggle */}
      <div className="lg:hidden space-y-4">
        <div className="flex bg-parchment border border-sand rounded-xl p-1 gap-1">
          <button onClick={() => setShowForm(true)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${showForm ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
            Generate
          </button>
          <button onClick={() => setShowForm(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!showForm ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
            Output {currentNote && <span className="text-ember-dark ml-1">●</span>}
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

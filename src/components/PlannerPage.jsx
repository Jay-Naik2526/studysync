import React, { useState, useEffect } from 'react';
import { Compass, Download, FileText, BookOpen, Brain, Calendar, ChevronDown, CheckSquare, Target, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { notesAPI, subjectsAPI } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';
import { SkeletonPlanner } from './SkeletonLoader';

function MarkdownRenderer({ content, isPrint = false }) {
  return (
    <div className={isPrint ? 'prose prose-slate max-w-none bg-white p-10 text-black' : 'markdown-atlas'}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'html' }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function PlannerPage() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSub, setSelectedSub] = useState('');
  const [weakTopics, setWeakTopics] = useState('');
  const [commitHours, setCommitHours] = useState('5');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPlanner, setCurrentPlanner] = useState(null);

  // Interactive checklist tasks
  const [checklist, setChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    subjectsAPI.getAll().then(r => setSubjects(r.data)).catch(console.error);

    // Load local storage checklist
    const savedList = localStorage.getItem('studysync_planner_checklist');
    if (savedList) {
      setChecklist(JSON.parse(savedList));
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCurrentPlanner(null);

    const formData = new FormData();
    formData.append('subjectId', selectedSub);
    formData.append('weakTopics', weakTopics);
    formData.append('commitHours', commitHours);
    if (file) {
      formData.append('policyFile', file);
    }

    try {
      const res = await notesAPI.generatePlanner(formData);
      setCurrentPlanner(res.data);

      // Auto-populate default weekly checklist items based on subject
      const defaultTasks = [
        { id: '1', text: `Read Chapter 1 / Policy Guidelines for ${res.data.subjectName}`, completed: false },
        { id: '2', text: `Review self-declared weak areas for ${res.data.subjectName}`, completed: false },
        { id: '3', text: `Generate first set of Practice Quizzes`, completed: false }
      ];
      setChecklist(defaultTasks);
      localStorage.setItem('studysync_planner_checklist', JSON.stringify(defaultTasks));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate Study Planner. Try again.');
    }
    setLoading(false);
  };

  const toggleChecklist = (id) => {
    const updated = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    localStorage.setItem('studysync_planner_checklist', JSON.stringify(updated));
  };

  const addChecklistItem = (e) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;

    const newItem = {
      id: Date.now().toString(),
      text: newChecklistItem.trim(),
      completed: false
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    localStorage.setItem('studysync_planner_checklist', JSON.stringify(updated));
    setNewChecklistItem('');
  };

  const deleteChecklistItem = (id) => {
    const updated = checklist.filter(item => item.id !== id);
    setChecklist(updated);
    localStorage.setItem('studysync_planner_checklist', JSON.stringify(updated));
  };

  const downloadPDF = () => {
    if (!currentPlanner) return;
    html2pdf().set({
      margin: [15, 15],
      filename: `${currentPlanner.subjectName}_StudyPlanner_StudySync.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(document.getElementById('printable-planner-content')).save();
  };

  const selectedSubjectObj = subjects.find(s => s._id === selectedSub);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 md:px-8">
      {/* Hidden PDF element */}
      <div className="hidden">
        <div id="printable-planner-content" style={{ width: '750px', background: 'white', color: 'black' }}>
          <div style={{ padding: '40px', borderBottom: '3px solid #E76F51' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#2B2B26', margin: 0 }}>
              Custom Study Planner: {currentPlanner?.subjectName}
            </h1>
            <p style={{ color: '#7A7566', marginTop: '6px', fontSize: '13px' }}>StudySync personalized roadmap</p>
          </div>
          <div style={{ padding: '40px' }}>
            {currentPlanner && (
              <MarkdownRenderer content={currentPlanner.planner} isPrint />
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-ember-dark uppercase tracking-widest mb-1">Route planning</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">Planner</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input Form Panel */}
        <div className="lg:col-span-4 self-start space-y-5">
          <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-ember flex items-center justify-center">
                <Compass size={13} className="text-white" />
              </div>
              <h2 className="text-sm font-display font-bold text-ink">Plan your route</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Select Subject */}
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Select subject</label>
                <div className="relative">
                  <select
                    value={selectedSub}
                    onChange={e => setSelectedSub(e.target.value)}
                    required
                    className="w-full bg-white border border-sand text-ink rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
                </div>
              </div>

              {/* Upload Course Policy File */}
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">
                  Course policy / syllabus <span className="normal-case font-normal text-ink-faint">(Syllabus PDF / Docx)</span>
                </label>
                <div className="relative border border-dashed border-sand-dark hover:border-ember/50 rounded-xl p-3.5 bg-white/50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.txt"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText size={18} className="text-ink-faint mb-1.5" />
                  <span className="text-xs text-ink font-medium truncate max-w-[200px]">
                    {file ? file.name : 'Choose syllabus policy file...'}
                  </span>
                  <span className="text-[10px] text-ink-faint mt-1">PDF, Word, or Text (Max 4.5MB)</span>
                </div>
              </div>

              {/* Weak Topics */}
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">
                  Your weak areas <span className="normal-case font-normal text-ink-faint">(optional)</span>
                </label>
                <textarea
                  value={weakTopics}
                  onChange={e => setWeakTopics(e.target.value)}
                  placeholder="e.g. Dynamic Programming, AVL Rotations, Graph DFS/BFS..."
                  className="w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember h-20 resize-none transition-all"
                />
              </div>

              {/* Commit Hours */}
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Weekly commitment</label>
                <div className="relative">
                  <select
                    value={commitHours}
                    onChange={e => setCommitHours(e.target.value)}
                    className="w-full bg-white border border-sand text-ink rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ember appearance-none transition-all cursor-pointer"
                  >
                    <option value="3">Light pace (3 hours/week)</option>
                    <option value="5">Standard pace (5 hours/week)</option>
                    <option value="8">Dedicated pace (8 hours/week)</option>
                    <option value="12">Accelerated pace (12 hours/week)</option>
                    <option value="15">Intense exam prep (15+ hours/week)</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedSub}
                className="w-full py-3 bg-ember hover:bg-ember-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Compass size={14} />
                {loading ? 'Charting route…' : 'Chart my route'}
              </button>
            </form>
          </div>

          {/* Interactive Study checklist card */}
          {currentPlanner && (
            <div className="bg-parchment border border-sand rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare size={15} className="text-sage-dark" />
                <h2 className="text-sm font-display font-bold text-ink">Checkpoints</h2>
              </div>

              {/* Checklist list */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/60 border border-sand">
                    <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => toggleChecklist(item.id)}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}}
                        className="accent-ember rounded border-sand bg-transparent cursor-pointer flex-shrink-0"
                      />
                      <span className={`text-xs leading-snug truncate ${item.completed ? 'text-ink-faint line-through' : 'text-ink font-medium'}`}>
                        {item.text}
                      </span>
                    </div>
                    <button onClick={() => deleteChecklistItem(item.id)} className="text-[10px] text-danger hover:text-ember-dark">✕</button>
                  </div>
                ))}
              </div>

              {/* Add checklist item */}
              <form onSubmit={addChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  placeholder="Add study task..."
                  required
                  className="flex-1 bg-white border border-sand text-ink placeholder-ink-faint rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-ember"
                />
                <button type="submit" className="px-3 bg-ember hover:bg-ember-dark text-white font-bold rounded-lg text-xs">+</button>
              </form>
            </div>
          )}
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-8">
          <div className="bg-parchment border border-sand rounded-2xl flex flex-col shadow-sm"
            style={{ height: 'clamp(400px, calc(100vh - 180px), 900px)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand flex-shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Route output</span>
                {currentPlanner && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ember-pale text-ember-dark truncate">
                    {currentPlanner.subjectName} study planner
                  </span>
                )}
              </div>
              {currentPlanner && (
                <button onClick={downloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ember hover:bg-ember-dark rounded-lg text-[11px] font-bold text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap">
                  <Download size={11} />PDF
                </button>
              )}
            </div>

            {/* Scroll Content container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7">
              {loading ? (
                <SkeletonPlanner />
              ) : currentPlanner ? (
                <div className="space-y-6">
                  {/* Dynamic Diagnostic Metrics Card */}
                  {selectedSubjectObj && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Attendance Card */}
                      <div className="p-4 rounded-xl bg-white/60 border border-sand flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-trail-pale flex items-center justify-center text-trail-dark">
                          <Calendar size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide">Attendance status</p>
                          <p className="text-base font-display font-bold text-ink mt-0.5 tabular-nums">
                            {selectedSubjectObj.conductedClasses > 0
                              ? `${Math.round(((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) * 100)}%`
                              : '100%'}
                          </p>
                          <p className="text-[10px] text-ink-muted truncate mt-0.5">
                            {selectedSubjectObj.absentClasses} absences / {selectedSubjectObj.conductedClasses} classes
                          </p>
                        </div>
                      </div>

                      {/* Commitment Hours */}
                      <div className="p-4 rounded-xl bg-white/60 border border-sand flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-ember-pale flex items-center justify-center text-ember-dark">
                          <Clock size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide">Weekly time</p>
                          <p className="text-base font-display font-bold text-ink mt-0.5 tabular-nums">{commitHours} hours</p>
                          <p className="text-[10px] text-ink-muted truncate mt-0.5">Commitment level</p>
                        </div>
                      </div>

                      {/* Subject Target Status */}
                      <div className="p-4 rounded-xl bg-white/60 border border-sand flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                          ${selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                            ? 'bg-danger-pale text-danger'
                            : 'bg-sage-pale text-sage-dark'
                          }`}
                        >
                          {selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                            ? <AlertTriangle size={18} />
                            : <Target size={18} />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide">Standing</p>
                          <p className={`text-xs font-display font-bold mt-0.5 truncate
                            ${selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                              ? 'text-danger'
                              : 'text-sage-dark'
                            }`}
                          >
                            {selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                              ? 'Below 80% — at risk'
                              : 'On track'
                            }
                          </p>
                          <p className="text-[10px] text-ink-muted truncate mt-0.5">Calculated from attendance</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Planner markdown */}
                  <MarkdownRenderer content={currentPlanner.planner} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-map border border-sand flex items-center justify-center mb-4">
                    <Calendar size={20} className="text-ink-faint" />
                  </div>
                  <p className="text-sm font-bold text-ink-muted">No route charted yet</p>
                  <p className="text-xs text-ink-faint mt-1.5 max-w-xs">
                    Upload your syllabus document, type in your difficult topics, select a subject, and chart your route!
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

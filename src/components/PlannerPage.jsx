import React, { useState, useEffect } from 'react';
import { Sparkles, Download, FileText, BookOpen, Brain, Calendar, ChevronDown, CheckSquare, Target, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { notesAPI, subjectsAPI } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';
import { SkeletonPlanner } from './SkeletonLoader';

function MarkdownRenderer({ content, isPrint = false }) {
  return (
    <div className={isPrint ? 'prose prose-slate max-w-none bg-white p-10 text-black' : 'markdown-dark'}>
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
          <div style={{ padding: '40px', borderBottom: '3px solid #7c3aed' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1e1b4b', margin: 0 }}>
              AI Custom Study Planner: {currentPlanner?.subjectName}
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '6px', fontSize: '13px' }}>StudySync Personalized Roadmap</p>
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
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Adaptive AI</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Planner</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input Form Panel */}
        <div className="lg:col-span-4 self-start space-y-5">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 glass-panel">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <h2 className="text-sm font-bold text-white">Planner Configuration</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Select Subject */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Select Subject</label>
                <div className="relative">
                  <select 
                    value={selectedSub} 
                    onChange={e => setSelectedSub(e.target.value)} 
                    required
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* Upload Course Policy File */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Course Policy / Syllabus <span className="normal-case font-normal text-zinc-700">(Syllabus PDF / Docx)</span>
                </label>
                <div className="relative border border-dashed border-white/[0.12] hover:border-violet-500/30 rounded-xl p-3.5 bg-white/[0.02] transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
                  <input 
                    type="file" 
                    onChange={handleFileChange} 
                    accept=".pdf,.docx,.doc,.txt"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText size={18} className="text-zinc-600 mb-1.5" />
                  <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">
                    {file ? file.name : 'Choose syllabus policy file...'}
                  </span>
                  <span className="text-[10px] text-zinc-600 mt-1">PDF, Word, or Text (Max 4.5MB)</span>
                </div>
              </div>

              {/* Weak Topics */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Your Weak Areas <span className="normal-case font-normal text-zinc-700">(optional)</span>
                </label>
                <textarea 
                  value={weakTopics}
                  onChange={e => setWeakTopics(e.target.value)}
                  placeholder="e.g. Dynamic Programming, AVL Rotations, Graph DFS/BFS..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-zinc-200 placeholder-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 h-20 resize-none transition-all"
                />
              </div>

              {/* Commit Hours */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Weekly Commitment</label>
                <div className="relative">
                  <select 
                    value={commitHours} 
                    onChange={e => setCommitHours(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 appearance-none transition-all cursor-pointer"
                  >
                    <option value="3">Light Pace (3 hours/week)</option>
                    <option value="5">Standard Pace (5 hours/week)</option>
                    <option value="8">Dedicated Pace (8 hours/week)</option>
                    <option value="12">Accelerated Pace (12 hours/week)</option>
                    <option value="15">Intense Exam Prep (15+ hours/week)</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !selectedSub}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
              >
                <Sparkles size={14} />
                {loading ? 'Creating Planner…' : 'Generate Roadmap'}
              </button>
            </form>
          </div>

          {/* Interactive Study checklist card */}
          {currentPlanner && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 glass-panel">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare size={15} className="text-fuchsia-400" />
                <h2 className="text-sm font-bold text-white">Focus Task Checklist</h2>
              </div>
              
              {/* Checklist list */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => toggleChecklist(item.id)}>
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        onChange={() => {}}
                        className="accent-violet-500 rounded border-white/[0.1] bg-transparent cursor-pointer flex-shrink-0"
                      />
                      <span className={`text-xs leading-snug truncate ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-300 font-medium'}`}>
                        {item.text}
                      </span>
                    </div>
                    <button onClick={() => deleteChecklistItem(item.id)} className="text-[10px] text-red-400 hover:text-red-300">✕</button>
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
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] text-zinc-300 placeholder-zinc-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-violet-500/50"
                />
                <button type="submit" className="px-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-xs">+</button>
              </form>
            </div>
          )}
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-8">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col"
            style={{ height: 'clamp(400px, calc(100vh - 180px), 900px)' }}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] flex-shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Roadmap Output</span>
                {currentPlanner && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 truncate">
                    {currentPlanner.subjectName} Study Planner
                  </span>
                )}
              </div>
              {currentPlanner && (
                <button onClick={downloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-[11px] font-semibold text-white transition-all shadow-md shadow-violet-500/20 flex-shrink-0 whitespace-nowrap">
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
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <Calendar size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Attendance Status</p>
                          <p className="text-base font-black text-white mt-0.5">
                            {selectedSubjectObj.conductedClasses > 0 
                              ? `${Math.round(((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) * 100)}%`
                              : '100%'}
                          </p>
                          <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                            {selectedSubjectObj.absentClasses} absences / {selectedSubjectObj.conductedClasses} classes
                          </p>
                        </div>
                      </div>

                      {/* Commitment Hours */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
                          <Clock size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Weekly Time</p>
                          <p className="text-base font-black text-white mt-0.5">{commitHours} Hours</p>
                          <p className="text-[10px] text-zinc-600 truncate mt-0.5">Commitment Level</p>
                        </div>
                      </div>

                      {/* Subject Target Status */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                          ${selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                            ? 'bg-red-500/10 text-red-400 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                            ? <AlertTriangle size={18} />
                            : <Target size={18} />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Status Warning</p>
                          <p className={`text-xs font-black mt-0.5 truncate
                            ${selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                              ? 'text-red-400'
                              : 'text-emerald-400'
                            }`}
                          >
                            {selectedSubjectObj.conductedClasses > 0 && ((selectedSubjectObj.conductedClasses - selectedSubjectObj.absentClasses) / selectedSubjectObj.conductedClasses) < 0.8
                              ? '⚠️ Below 80% limit!'
                              : '👍 Safe Standing'
                            }
                          </p>
                          <p className="text-[10px] text-zinc-600 truncate mt-0.5">Calculated Target metrics</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Planner markdown */}
                  <MarkdownRenderer content={currentPlanner.planner} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/15 to-fuchsia-600/15 border border-violet-500/15 flex items-center justify-center mb-4">
                    <Calendar size={20} className="text-violet-500/50 animate-pulse" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-500">Study Planner Empty</p>
                  <p className="text-xs text-zinc-700 mt-1.5 max-w-xs">
                    Upload your syllabus document, type in your difficult topics, select a subject, and click roadmap!
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

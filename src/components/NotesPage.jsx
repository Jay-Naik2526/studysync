import React, { useState, useEffect } from 'react';
import { notesAPI, subjectsAPI } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';

const MarkdownRenderer = React.memo(({ content, isPrint = false }) => (
  <div className={isPrint ? "prose prose-slate max-w-none bg-white p-10" : "prose prose-invert prose-blue max-w-none p-8 animate-fadeIn"}>
    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
      {content}
    </ReactMarkdown>
  </div>
));

export default function NotesPage({ onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSub, setSelectedSub] = useState('');
  const [currentNote, setCurrentNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    subjectsAPI.getAll().then(res => setSubjects(res.data));
  }, []);

  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => setProgress(prev => (prev < 90 ? prev + Math.random() * 5 : prev)), 800);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await notesAPI.generate(new FormData(e.target));
      setCurrentNote(res.data);
    } catch (err) { alert(err.response?.data?.message || "Generation failed."); }
    setLoading(false);
  };

  const downloadPDF = () => {
    const element = document.getElementById('printable-pdf-content');
    html2pdf().set({
      margin: [10, 10],
      filename: `${currentNote.title}_StudySync.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  };

  return (
    <div className="min-h-screen bg-[#0d1524] text-white p-4 md:p-8">
      {/* Hidden PDF container (White Academic Style) */}
      <div className="hidden">
        <div id="printable-pdf-content" style={{ width: '750px', background: 'white', color: 'black' }}>
          <div className="p-10 border-b-4 border-blue-600">
            <h1 className="text-3xl font-black text-blue-900">{currentNote?.title}</h1>
            <p className="text-gray-500">StudySync AI Academic Material</p>
          </div>
          <div className="p-10">
            {currentNote && (
              (currentNote.type === 'detailed' || currentNote.type === 'short') 
              ? <MarkdownRenderer content={currentNote.content} isPrint={true} />
              : currentNote.content.map((item, i) => (
                <div key={i} className="mb-6 border-b pb-4">
                  <p className="font-bold">{i+1}. {item.question}</p>
                  {item.options && item.options.map((opt, idx) => <p key={idx} className="ml-5 italic">- {opt}</p>)}
                  <p className="text-green-700 font-bold mt-2">Answer: {item.answer || item.correctAnswer}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => onNavigate('dashboard')} className="px-6 py-2 bg-gray-800 rounded-xl text-blue-400 font-bold border border-gray-700 active:scale-95 transition">← Dashboard</button>
          <h1 className="text-3xl font-black italic">Study<span className="text-blue-500">Sync</span> AI</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-gray-800/40 border border-gray-700 p-8 rounded-3xl sticky top-8 shadow-2xl backdrop-blur-md">
              <h2 className="text-xl font-bold mb-6 flex items-center">🎓 Professor Engine</h2>
              <form onSubmit={handleGenerate} className="space-y-4">
                <select name="subjectId" onChange={(e) => setSelectedSub(e.target.value)} className="w-full bg-gray-900 border border-gray-700 p-4 rounded-2xl outline-none" required>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <input name="title" placeholder="Topic Title" className="w-full bg-gray-900 border border-gray-700 p-4 rounded-2xl outline-none" required />
                <select name="type" className="w-full bg-gray-900 border border-gray-700 p-4 rounded-2xl outline-none">
                  <option value="detailed">📖 Masterclass Textbook (High Detail)</option>
                  <option value="short">🧠 Smart Revision Guide (Logic Dense)</option>
                  <option value="flashcards">🃏 Active Recall Cards</option>
                  <option value="quiz">📝 Practice Exam</option>
                </select>
                <textarea name="description" placeholder="Paste context, syllabus, or keywords..." className="w-full bg-gray-900 border border-gray-700 p-4 rounded-2xl h-32 outline-none resize-none" />
                <input type="file" name="files" multiple className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-blue-600/10 file:text-blue-400 file:font-bold" />
                
                {loading && (
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}
                
                <button disabled={loading || !selectedSub} className="w-full py-5 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95">
                  {loading ? "AI IS THINKING..." : "🚀 START GENERATION"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-gray-800/20 border border-gray-700 rounded-3xl flex flex-col h-[85vh] overflow-hidden">
              <div className="p-4 bg-gray-900/60 flex justify-between items-center border-b border-gray-700">
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Academic Output</span>
                {currentNote && (
                  <button onClick={downloadPDF} className="bg-blue-600 px-6 py-2 rounded-full text-xs font-black hover:bg-blue-500 transition shadow-lg flex items-center">
                    <span className="mr-2">📥</span> DOWNLOAD NOTES
                  </button>
                )}
              </div>
              <div className="p-6 md:p-12 flex-grow overflow-y-auto custom-scrollbar">
                {currentNote ? (
                  <div className="animate-fadeIn">
                    <h3 className="text-4xl font-black mb-10 tracking-tighter italic">{currentNote.title}</h3>
                    {(currentNote.type === 'detailed' || currentNote.type === 'short') ? (
                      <MarkdownRenderer content={currentNote.content} />
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {currentNote.content.map((item, i) => (
                          <div key={i} className="p-8 bg-gray-900/80 border border-gray-700 rounded-3xl shadow-xl">
                            <p className="text-blue-500 font-black text-[10px] uppercase mb-4 tracking-widest">Question {i+1}</p>
                            <p className="text-xl font-bold mb-6 leading-relaxed">{item.question}</p>
                            {item.options && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
                                {item.options.map((opt, idx) => <div key={idx} className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700"><b>{String.fromCharCode(65+idx)}:</b> {opt}</div>)}
                              </div>
                            )}
                            <div className="pt-6 border-t border-gray-800">
                              <p className="text-green-400 font-bold flex items-center">
                                <span className="mr-2 text-xl">✅</span> {item.answer ? `Answer: ${item.answer}` : `Correct: ${item.correctAnswer}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-700 italic opacity-40">
                    <span className="text-9xl mb-6">📚</span>
                    <p className="text-xl">Your professor is ready to write. Upload context to begin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
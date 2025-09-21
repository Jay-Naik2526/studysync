import React, { useState, useEffect } from 'react';
import { subjectsAPI } from '../api';

export default function SubjectsPage({ onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectTotal, setNewSubjectTotal] = useState("");
  const [newSubjectTotalMarks, setNewSubjectTotalMarks] = useState(100);
  const [error, setError] = useState("");

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await subjectsAPI.getAll();
      setSubjects(response.data);
    } catch (err) {
      setError("Failed to load subjects.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName) return;
    try {
      await subjectsAPI.create({ 
          name: newSubjectName, 
          totalPlannedClasses: newSubjectTotal || 0,
          totalMarks: newSubjectTotalMarks 
      });
      setNewSubjectName(""); 
      setNewSubjectTotal("");
      setNewSubjectTotalMarks(100);
      await fetchSubjects();
    } catch (error) { 
      setError("Failed to add subject.");
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 py-8 px-4 text-white">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => onNavigate('dashboard')} className="mb-8 text-gray-300 hover:text-white transition-colors">&larr; Back to Dashboard</button>
        <h1 className="text-4xl font-bold mb-2">Manage Subjects</h1>
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Add a New Subject</h2>
          <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Subject Name" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="md:col-span-1 bg-gray-700 rounded-lg p-3 focus:outline-none" required />
            <input type="number" placeholder="Total Planned Classes" value={newSubjectTotal} onChange={e => setNewSubjectTotal(e.target.value)} className="md:col-span-1 bg-gray-700 rounded-lg p-3 focus:outline-none" required />
            <input type="number" placeholder="Overall Total Marks" value={newSubjectTotalMarks} onChange={e => setNewSubjectTotalMarks(e.target.value)} className="md:col-span-1 bg-gray-700 rounded-lg p-3 focus:outline-none" required />
            <button type="submit" className="md:col-span-3 bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg">+ Add Subject</button>
          </form>
          {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Your Subjects</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              {subjects.length > 0 ? (
                subjects.map((subject) => (
                  <div key={subject._id} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold">{subject.name}</h3>
                      <p className="text-gray-400">Total Marks: {subject.totalMarks}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">You haven't added any subjects yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
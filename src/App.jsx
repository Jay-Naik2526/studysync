import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import AttendancePage from './components/AttendancePage';
import MarksPage from './components/MarksPage';
import SubjectsPage from './components/SubjectsPage';
import NotesPage from './components/NotesPage'; // [NEW] Import the AI Notes Page

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');

  // Check for existing session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('dashboard');
  };

  const onNavigate = (newView) => {
    setView(newView);
    window.scrollTo(0, 0); // Reset scroll on navigation
  };

  // Auth Guard: Show login if no user/token is present
  if (!user && !localStorage.getItem('token')) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0d1524]">
      {/* Navigation Logic for StudySync */}
      {view === 'dashboard' && (
        <DashboardPage onNavigate={onNavigate} onLogout={handleLogout} />
      )}
      {view === 'attendance' && <AttendancePage onNavigate={onNavigate} />}
      {view === 'marks' && <MarksPage onNavigate={onNavigate} />}
      {view === 'subjects' && <SubjectsPage onNavigate={onNavigate} />}
      
      {/* [NEW] Render NotesPage when view is 'notes' */}
      {view === 'notes' && <NotesPage onNavigate={onNavigate} />}
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import AttendancePage from './components/AttendancePage';
import MarksPage from './components/MarksPage';
import SubjectsPage from './components/SubjectsPage';
import NotesPage from './components/NotesPage';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    // Data contains { token, user } from backend
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
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
    window.scrollTo(0, 0);
  };

  if (loading) return <div className="min-h-screen bg-[#0d1524] text-white flex items-center justify-center">Loading StudySync...</div>;

  if (!user && !localStorage.getItem('token')) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0d1524]">
      {view === 'dashboard' && <DashboardPage onNavigate={onNavigate} onLogout={handleLogout} />}
      {view === 'attendance' && <AttendancePage onNavigate={onNavigate} />}
      {view === 'marks' && <MarksPage onNavigate={onNavigate} />}
      {view === 'subjects' && <SubjectsPage onNavigate={onNavigate} />}
      {view === 'notes' && <NotesPage onNavigate={onNavigate} />}
    </div>
  );
}

export default App;
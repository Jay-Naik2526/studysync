import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import AttendancePage from './components/AttendancePage';
import MarksPage from './components/MarksPage';
import SubjectsPage from './components/SubjectsPage';
import NotesPage from './components/NotesPage';
import PlannerPage from './components/PlannerPage';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (!user && !localStorage.getItem('token')) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <Layout currentView={view} onNavigate={onNavigate} onLogout={handleLogout} user={user}>
      {view === 'dashboard' && <DashboardPage onNavigate={onNavigate} />}
      {view === 'attendance' && <AttendancePage onNavigate={onNavigate} />}
      {view === 'marks' && <MarksPage onNavigate={onNavigate} />}
      {view === 'subjects' && <SubjectsPage onNavigate={onNavigate} />}
      {view === 'notes' && <NotesPage onNavigate={onNavigate} />}
      {view === 'planner' && <PlannerPage onNavigate={onNavigate} />}
    </Layout>
  );
}

export default App;

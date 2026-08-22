import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import AttendancePage from './components/AttendancePage';
import ClassCountPage from './components/ClassCountPage';
import MarksPage from './components/MarksPage';
import SubjectsPage from './components/SubjectsPage';
import NotesPage from './components/NotesPage';
import PlannerPage from './components/PlannerPage';
import ProfilePage from './components/ProfilePage';
import ApplicationsPage from './components/ApplicationsPage';
import MentorDashboardPage from './components/MentorDashboardPage';
import MenteesPage from './components/MenteesPage';
import MenteeDetailPage from './components/MenteeDetailPage';
import MentorApplicationsPage from './components/MentorApplicationsPage';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedMenteeId, setSelectedMenteeId] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // Set the correct default view based on role
      setView(parsed.role === 'mentor' ? 'mentor-dashboard' : 'dashboard');
    }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    setView(data.user.role === 'mentor' ? 'mentor-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('dashboard');
  };

  const onNavigate = (newView) => {
    setView(newView);
    setSelectedMenteeId(null); // reset mentee selection on nav
    window.scrollTo(0, 0);
  };

  const handleSelectMentee = (menteeId) => {
    setSelectedMenteeId(menteeId);
    setView('mentee-detail');
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink-muted flex items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (!user && !localStorage.getItem('token')) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const role = user?.role || 'student';

  return (
    <Layout currentView={view} onNavigate={onNavigate} onLogout={handleLogout} user={user}>
      {/* ── Student views ── */}
      {role === 'student' && view === 'dashboard' && <DashboardPage onNavigate={onNavigate} />}
      {role === 'student' && view === 'attendance' && <AttendancePage onNavigate={onNavigate} />}
      {role === 'student' && view === 'classcount' && <ClassCountPage onNavigate={onNavigate} />}
      {role === 'student' && view === 'marks' && <MarksPage onNavigate={onNavigate} />}
      {role === 'student' && view === 'subjects' && <SubjectsPage onNavigate={onNavigate} />}
      {role === 'student' && view === 'notes' && <NotesPage onNavigate={onNavigate} />}
      {role === 'student' && view === 'planner' && <PlannerPage onNavigate={onNavigate} />}
      {role === 'student' && view === 'applications' && <ApplicationsPage />}

      {/* ── Mentor views ── */}
      {role === 'mentor' && view === 'mentor-dashboard' && <MentorDashboardPage onNavigate={onNavigate} />}
      {role === 'mentor' && view === 'mentees' && (
        <MenteesPage onNavigate={onNavigate} onSelectMentee={handleSelectMentee} />
      )}
      {role === 'mentor' && view === 'mentee-detail' && selectedMenteeId && (
        <MenteeDetailPage
          studentId={selectedMenteeId}
          onBack={() => onNavigate('mentees')}
        />
      )}
      {role === 'mentor' && view === 'mentor-applications' && <MentorApplicationsPage />}

      {/* ── Shared views ── */}
      {view === 'profile' && <ProfilePage />}
    </Layout>
  );
}

export default App;

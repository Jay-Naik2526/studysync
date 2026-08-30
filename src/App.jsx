import React, { useState, useEffect, useMemo } from 'react';
import { profileAPI } from './api';
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

// Known views per role — used to detect and recover from an unmatched view
const STUDENT_VIEWS = new Set([
  'dashboard', 'attendance', 'classcount', 'marks', 'subjects',
  'notes', 'planner', 'applications', 'profile',
]);
const MENTOR_VIEWS = new Set([
  'mentor-dashboard', 'mentees', 'mentee-detail', 'mentor-applications', 'profile',
]);

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedMenteeId, setSelectedMenteeId] = useState(null);

  // On mount: if a token exists, refresh the user from the server (source of truth)
  // so stale localStorage (missing role, wrong role) is always fixed.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Use localStorage as an optimistic cache while the profile fetch is in-flight
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setView(parsed.role === 'mentor' ? 'mentor-dashboard' : 'dashboard');
      } catch { /* ignore parse errors */ }
    }

    // Refresh from server
    profileAPI.get()
      .then(res => {
        const fresh = res.data;
        const freshUser = {
          _id: fresh._id,
          name: fresh.name,
          email: fresh.email,
          role: fresh.role || 'student',
          mentorCode: fresh.mentorCode,
        };
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
        setView(prev => {
          // If current view isn't valid for this role, reset to default
          const validViews = freshUser.role === 'mentor' ? MENTOR_VIEWS : STUDENT_VIEWS;
          if (!validViews.has(prev)) {
            return freshUser.role === 'mentor' ? 'mentor-dashboard' : 'dashboard';
          }
          return prev;
        });
      })
      .catch(() => {
        // Token invalid — clear and show login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
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

  if (!user || !localStorage.getItem('token')) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const role = user?.role || 'student';

  // Fix 4: detect unmatched views (e.g. mentee-detail without a selected ID) and
  // fall back to the role's default instead of rendering a blank screen.
  const validViews = role === 'mentor' ? MENTOR_VIEWS : STUDENT_VIEWS;
  const isViewValid = validViews.has(view);
  const needsMenteeId = view === 'mentee-detail' && !selectedMenteeId;

  if (!isViewValid || needsMenteeId) {
    // Schedule a redirect back to default, render nothing this frame
    const defaultView = role === 'mentor' ? 'mentor-dashboard' : 'dashboard';
    if (view !== defaultView) {
      // Use a microtask so we don't set state during render
      queueMicrotask(() => onNavigate(defaultView));
    }
  }

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

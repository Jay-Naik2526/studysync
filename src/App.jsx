import React, { useState } from 'react';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import AttendancePage from './components/AttendancePage';
import MarksPage from './components/MarksPage';
import SubjectsPage from './components/SubjectsPage';

// This component holds the main app navigation and must be defined OUTSIDE of App
const AppContainer = () => {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const navigateTo = (page) => setCurrentPage(page);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.reload(); // The simplest way to reset all states
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'subjects': return <SubjectsPage onNavigate={navigateTo} />;
            case 'attendance': return <AttendancePage onNavigate={navigateTo} />;
            case 'marks': return <MarksPage onNavigate={navigateTo} />;
            default: return <DashboardPage onNavigate={navigateTo} />;
        }
    };

    return (
        <div>
            <button 
                onClick={handleLogout} 
                className="absolute top-4 right-28 z-50 bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 transition-transform hover:scale-105"
            >
                Logout
            </button>
            {renderPage()}
        </div>
    );
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const handleAuthSuccess = () => {
      setToken(localStorage.getItem('token'));
  };

  if (!token) {
      return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return <AppContainer />;
}


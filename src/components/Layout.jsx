import React from 'react';
import { LayoutDashboard, CalendarDays, BarChart2, BookOpen, FileText, Compass, LogOut } from 'lucide-react';
import ContourBackdrop from './ContourBackdrop';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: CalendarDays },
  { id: 'marks', label: 'Marks', icon: BarChart2 },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'planner', label: 'Planner', icon: Compass },
];

export default function Layout({ currentView, onNavigate, onLogout, user, children }) {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans relative overflow-x-hidden">
      <ContourBackdrop />

      {/* Page content — extra bottom padding so nav never covers content */}
      <div className="relative z-10 pb-32">
        {children}
      </div>

      {/* ── Floating pill nav ── */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 p-1.5 rounded-full bg-parchment/95 backdrop-blur border border-sand shadow-lg shadow-ink/10"
        style={{ maxWidth: 'calc(100vw - 24px)' }}>

        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-label={label}
              className={`relative flex items-center gap-1.5 rounded-full transition-all duration-300 select-none
                ${active
                  ? 'bg-ember text-white shadow-sm px-3 py-2 sm:px-4 sm:py-2.5'
                  : 'text-ink-muted hover:text-ink hover:bg-ink/5 px-2.5 py-2 sm:px-3 sm:py-2.5'
                }`}
            >
              <Icon size={15} className="flex-shrink-0" />
              {/* label: always visible on sm+, only visible when active on xs */}
              <span className={`text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ${
                active ? 'max-w-[72px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
              } sm:max-w-[72px] sm:opacity-100 ${!active ? 'hidden sm:block' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-sand mx-1 flex-shrink-0" />

        <button
          onClick={onLogout}
          aria-label="Sign out"
          className="flex items-center gap-1.5 rounded-full text-ink-faint hover:text-ink hover:bg-ink/5 transition-all px-2.5 py-2 sm:px-3 sm:py-2.5"
        >
          <LogOut size={14} className="flex-shrink-0" />
          <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">Sign out</span>
        </button>
      </nav>
    </div>
  );
}

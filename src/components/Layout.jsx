import React from 'react';
import { LayoutDashboard, CalendarDays, BarChart2, BookOpen, Sparkles, CalendarCheck, LogOut } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: CalendarDays },
  { id: 'marks', label: 'Marks', icon: BarChart2 },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'notes', label: 'AI Notes', icon: Sparkles },
  { id: 'planner', label: 'AI Planner', icon: CalendarCheck },
];

export default function Layout({ currentView, onNavigate, onLogout, user, children }) {
  return (
    <div className="min-h-screen bg-[#07070c] text-white relative overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-violet-700/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-[350px] h-[350px] bg-fuchsia-700/8 rounded-full blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[250px] bg-indigo-800/8 rounded-full blur-[90px]" />
      </div>

      {/* Page content — extra bottom padding so nav never covers content */}
      <div className="relative z-10 pb-32">
        {children}
      </div>

      {/* ── Floating pill nav ── */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 p-1.5 rounded-full bg-[#0d0c17]/95 backdrop-blur-2xl border border-white/[0.09] shadow-2xl shadow-black/70"
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
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 px-3 py-2 sm:px-4 sm:py-2.5'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] px-2.5 py-2 sm:px-3 sm:py-2.5'
                }`}
            >
              <Icon size={15} className="flex-shrink-0" />
              {/* label: always visible on sm+, only visible when active on xs */}
              <span className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
                active ? 'max-w-[72px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
              } sm:max-w-[72px] sm:opacity-100 ${!active ? 'hidden sm:block' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

        <button
          onClick={onLogout}
          aria-label="Sign Out"
          className="flex items-center gap-1.5 rounded-full text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all px-2.5 py-2 sm:px-3 sm:py-2.5"
        >
          <LogOut size={14} className="flex-shrink-0" />
          <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">Sign Out</span>
        </button>
      </nav>
    </div>
  );
}

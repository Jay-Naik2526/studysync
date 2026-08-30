import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CalendarDays, Calculator, BarChart2, BookOpen, FileText, Compass, LogOut, Users, Inbox, UserCircle, MoreHorizontal, X } from 'lucide-react';
import ContourBackdrop from './ContourBackdrop';

const studentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: CalendarDays },
  { id: 'classcount', label: 'Classes', icon: Calculator },
  { id: 'marks', label: 'Marks', icon: BarChart2 },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'planner', label: 'Planner', icon: Compass },
  { id: 'applications', label: 'Applications', icon: Inbox },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

const mentorNavItems = [
  { id: 'mentor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'mentees', label: 'Mentees', icon: Users },
  { id: 'mentor-applications', label: 'Inbox', icon: Inbox },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

// Slots available in the mobile bar. When everything (nav + sign out) fits, we show it
// all; otherwise the last slot becomes "More" and the overflow goes into a sheet.
const MOBILE_SLOTS = 5;

export default function Layout({ currentView, onNavigate, onLogout, user, children }) {
  const role = user?.role || 'student';
  const navItems = role === 'mentor' ? mentorNavItems : studentNavItems;

  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the sheet on Escape, and lock body scroll while it is open
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  // Never leave the sheet open across a navigation
  useEffect(() => { setSheetOpen(false); }, [currentView]);

  const fitsWithoutMore = navItems.length + 1 <= MOBILE_SLOTS; // +1 for Sign out
  const barItems  = fitsWithoutMore ? navItems : navItems.slice(0, MOBILE_SLOTS - 1);
  const moreItems = fitsWithoutMore ? []       : navItems.slice(MOBILE_SLOTS - 1);
  const moreIsActive = moreItems.some(i => i.id === currentView);

  const go = (id) => { setSheetOpen(false); onNavigate(id); };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans relative overflow-x-hidden">
      <ContourBackdrop />

      {/* Page content — bottom padding clears the fixed nav on every breakpoint */}
      <div className="relative z-10 pb-28 lg:pb-32">
        {children}
      </div>

      {/* ══ Mobile / tablet: full-width bottom bar (below lg) ══ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-parchment/95 backdrop-blur border-t border-sand shadow-[0_-2px_16px_-8px_rgba(43,43,38,0.25)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${MOBILE_SLOTS}, minmax(0, 1fr))` }}>
          {barItems.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors focus:outline-none focus-visible:bg-ink/5
                  ${active ? 'text-ember-dark' : 'text-ink-muted active:bg-ink/5'}`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} className="flex-shrink-0" />
                <span className={`text-[10px] leading-none truncate max-w-full px-0.5 ${active ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </button>
            );
          })}

          {fitsWithoutMore ? (
            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-ink-faint active:bg-ink/5 transition-colors focus:outline-none focus-visible:bg-ink/5"
            >
              <LogOut size={19} strokeWidth={2} className="flex-shrink-0" />
              <span className="text-[10px] leading-none font-medium">Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              aria-haspopup="menu"
              className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors focus:outline-none focus-visible:bg-ink/5
                ${moreIsActive ? 'text-ember-dark' : 'text-ink-muted active:bg-ink/5'}`}
            >
              <MoreHorizontal size={19} strokeWidth={moreIsActive ? 2.4 : 2} className="flex-shrink-0" />
              <span className={`text-[10px] leading-none ${moreIsActive ? 'font-bold' : 'font-medium'}`}>More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ══ Mobile "More" sheet ══ */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="More pages">
          <button
            aria-label="Close menu"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 w-full h-full bg-ink/40 backdrop-blur-[2px]"
          />
          <div
            className="absolute bottom-0 inset-x-0 bg-parchment border-t border-sand rounded-t-2xl shadow-2xl p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">More</p>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close menu"
                className="p-1.5 -m-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {moreItems.map(({ id, label, icon: Icon }) => {
                const active = currentView === id;
                return (
                  <button
                    key={id}
                    onClick={() => go(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border transition-colors
                      ${active
                        ? 'bg-ember text-white border-ember'
                        : 'bg-white border-sand text-ink-muted hover:text-ink hover:border-sand-dark'}`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="text-[11px] font-bold text-center leading-tight px-1">{label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-sand bg-white text-ink-muted hover:text-danger hover:border-danger/30 hover:bg-danger-pale transition-colors"
            >
              <LogOut size={15} />
              <span className="text-xs font-bold">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* ══ Desktop: floating pill (lg and up, where every label fits) ══ */}
      <nav className="hidden lg:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-50 items-center gap-0.5 p-1.5 rounded-full bg-parchment/95 backdrop-blur border border-sand shadow-lg shadow-ink/10"
        style={{ maxWidth: 'calc(100vw - 24px)' }}>

        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-1.5 rounded-full transition-all duration-300 select-none px-3 py-2.5
                ${active ? 'bg-ember text-white shadow-sm' : 'text-ink-muted hover:text-ink hover:bg-ink/5'}`}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="text-xs font-bold whitespace-nowrap">{label}</span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-sand mx-1 flex-shrink-0" />

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-full text-ink-faint hover:text-ink hover:bg-ink/5 transition-all px-3 py-2.5"
        >
          <LogOut size={14} className="flex-shrink-0" />
          <span className="text-xs font-medium whitespace-nowrap">Sign out</span>
        </button>
      </nav>
    </div>
  );
}

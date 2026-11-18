import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { LayoutDashboard, ClipboardCheck, CalendarDays, Calculator, BarChart2, BookOpen, FileText, Compass, LogOut, Users, Inbox, UserCircle, MoreHorizontal, X } from 'lucide-react';
import ContourBackdrop from './ContourBackdrop';
import { InstallBanner, OfflineBar } from './InstallApp';
import { ThemeToggle } from '../theme.jsx';

const studentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
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

// The floating pill holds every item on one line, which needs ~1100px. Below 1180px the
// bottom bar is used instead (tablets, small laptops, split-screen windows).
// Slots available in the mobile bar. When everything (nav + sign out) fits, we show it
// all; otherwise the last slot becomes "More" and the overflow goes into a sheet.
const MOBILE_SLOTS = 5;

export default function Layout({ currentView, onNavigate, onLogout, user, children }) {
  const role = user?.role || 'student';
  const navItems = role === 'mentor' ? mentorNavItems : studentNavItems;

  const [sheetOpen, setSheetOpen] = useState(false);
  const pillRef = useRef(null);
  const [clip, setClip] = useState(null);   // clip-path that reveals only the active item of the overlay copy
  const [clipReady, setClipReady] = useState(false);

  // The pill holds two copies of its items. The top copy is styled as "active" and clipped to
  // the active item, so background and text colour move together as one element.
  useLayoutEffect(() => {
    const measure = () => {
      const nav = pillRef.current;
      const el = nav?.querySelector('[aria-current="page"]');
      if (!nav || !el) { setClip(null); return; }
      const W = nav.clientWidth, H = nav.clientHeight;
      const x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
      setClip(`inset(${y}px ${W - x - w}px ${H - y - h}px ${x}px round ${h / 2}px)`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (pillRef.current) ro.observe(pillRef.current);
    document.fonts?.ready.then(measure);
    const t = setTimeout(() => setClipReady(true), 120);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [currentView, role]);

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
    <div className="min-h-screen min-h-dvh bg-paper text-ink font-sans relative overflow-x-hidden">
      <ContourBackdrop />
      <OfflineBar />

      {/* Page content — bottom padding clears the fixed nav on every breakpoint */}
      <div className="relative z-10 pb-28 min-[1180px]:pb-32">
        <InstallBanner />
        <div key={currentView} className="page-enter">{children}</div>
      </div>

      {/* ══ Mobile / tablet: full-width bottom bar (below lg) ══ */}
      <nav
        className="min-[1180px]:hidden nav-glass fixed bottom-0 inset-x-0 z-50 border-t border-sand"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid relative" style={{ gridTemplateColumns: `repeat(${MOBILE_SLOTS}, minmax(0, 1fr))` }}>
          {(() => {
            const idx = moreIsActive ? barItems.length : barItems.findIndex(i => i.id === currentView);
            return idx < 0 ? null : (
              <span aria-hidden="true" className="absolute top-0 left-0 h-0.5 bg-ember pointer-events-none"
                style={{ width: `${100 / MOBILE_SLOTS}%`, transform: `translateX(${idx * 100}%)`, transition: 'transform 260ms var(--ease-in-out)' }} />
            );
          })()}
          {barItems.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors focus:outline-none focus-visible:bg-ink/5
                  ${active ? 'text-ember-dark' : 'text-ink-muted active:bg-ink/5'}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className={`text-[11px] leading-none truncate max-w-full px-0.5 font-medium`}>
                  {label}
                </span>
              </button>
            );
          })}

          {fitsWithoutMore ? (
            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-ink-faint active:bg-ink/5 transition-colors focus:outline-none focus-visible:bg-ink/5"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span className="text-[11px] leading-none font-medium">Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              aria-haspopup="menu"
              className={`flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors focus:outline-none focus-visible:bg-ink/5
                ${moreIsActive ? 'text-ember-dark' : 'text-ink-muted active:bg-ink/5'}`}
            >
              <MoreHorizontal size={18} className="flex-shrink-0" />
              <span className={`text-[11px] leading-none ${moreIsActive ? 'font-medium' : 'font-medium'}`}>More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ══ Mobile "More" sheet ══ */}
      {sheetOpen && (
        <div className="min-[1180px]:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="More pages">
          <button
            aria-label="Close menu"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 w-full h-full bg-ink/40 backdrop-blur-[2px] anim-fade"
          />
          <div
            className="absolute bottom-0 inset-x-0 anim-pop bg-parchment border-t border-sand rounded-t-2xl shadow-lg shadow-ink/10 p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-ink-muted">More</p>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close menu"
                className="p-2 -m-2 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
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
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-colors
                      ${active
                        ? 'bg-ember text-white border-ember'
                        : 'bg-white border-sand text-ink-muted hover:text-ink hover:border-sand-dark'}`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="text-xs font-medium text-center leading-tight px-1">{label}</span>
                  </button>
                );
              })}
            </div>

            <ThemeToggle showLabel className="mt-3 w-full py-3 rounded-xl border border-sand bg-white" />

            <button
              onClick={onLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-sand bg-white text-ink-muted hover:text-danger hover:border-danger/30 hover:bg-danger-pale transition-colors"
            >
              <LogOut size={16} />
              <span className="text-xs font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* ══ Desktop: floating pill (lg and up, where every label fits) ══ */}
      <div aria-hidden="true" className="nav-fade hidden min-[1180px]:block fixed inset-x-0 bottom-0 h-32 z-40 pointer-events-none" />
      <nav ref={pillRef} className="nav-glass hidden min-[1180px]:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-50 items-center gap-0.5 p-2 rounded-full border border-sand"
        style={{ maxWidth: 'calc(100vw - 24px)' }}>

        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-2 rounded-full select-none px-3 py-3
                ${active ? 'text-transparent' : 'text-ink-muted hover:text-ink hover:bg-ink/5'}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">{label}</span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-sand mx-1 flex-shrink-0" />

        <ThemeToggle className="rounded-full p-2.5 transition-colors" />

        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-full text-ink-faint hover:text-ink hover:bg-ink/5 px-3 py-3"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className="text-xs font-medium whitespace-nowrap">Sign out</span>
        </button>

        {/* Active copy: same layout, accent background and white text, clipped to the active item */}
        {clip && (
          <div aria-hidden="true" className="absolute inset-0 flex items-center gap-0.5 p-2 rounded-full bg-ember text-white pointer-events-none"
            style={{ clipPath: clip, transition: clipReady ? 'clip-path 260ms var(--ease-in-out)' : 'none' }}>
            {navItems.map(({ id, label, icon: Icon }) => (
              <span key={id} className="flex items-center gap-2 px-3 py-3 flex-shrink-0">
                <Icon size={16} className="flex-shrink-0" />
                <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              </span>
            ))}
            <span className="w-px h-5 mx-1 flex-shrink-0" />
            <span className="p-2.5 w-[36px] flex-shrink-0" />
            <span className="px-3 py-3 flex-shrink-0 opacity-0">Sign out</span>
          </div>
        )}
      </nav>
    </div>
  );
}

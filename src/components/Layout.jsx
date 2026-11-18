import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard, ClipboardCheck, CalendarDays, Calculator, BarChart2, BookOpen, FileText, Compass,
  LogOut, Users, Inbox, UserCircle, LayoutGrid, ChevronUp, Search, Palette, X,
} from 'lucide-react';
import ContourBackdrop from './ContourBackdrop';
import PageLoader from './PageLoader';
import CommandPalette from './CommandPalette';
import { NeonBackdrop, WeaponWheel } from './NeonHud';
import { InstallBanner, OfflineBar } from './InstallApp';
import { ThemeToggle, useTheme, THEME_INFO } from '../theme.jsx';
import { useLoaderMode } from '../prefs.js';

// Everything a student can open. The first five are pinned to the nav; the rest live in "More"
// (and in the Ctrl/Cmd+K palette), so the bar stays short without hiding anything.
const studentNavItems = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard, note: 'Your semester at a glance',                 keys: 'home overview' },
  { id: 'attendance',   label: 'Attendance',   icon: ClipboardCheck,  note: 'Register, SAP sync and what-if predictor',  keys: 'present absent sap sync skip' },
  { id: 'calendar',     label: 'Calendar',     icon: CalendarDays,    note: 'Day by day, plus the skip planner',         keys: 'days trend skip planner' },
  { id: 'notes',        label: 'Notes',        icon: FileText,        note: 'Generate notes, flashcards and quizzes',    keys: 'study flashcards quiz ai' },
  { id: 'profile',      label: 'Profile',      icon: UserCircle,      note: 'Your details, mentor and appearance',       keys: 'account mentor theme settings' },
  { id: 'classcount',   label: 'Class count',  icon: Calculator,      note: 'Classes held against classes owed',         keys: 'backlog lectures labs' },
  { id: 'marks',        label: 'Marks',        icon: BarChart2,       note: 'Scores, tasks and the goal calculator',     keys: 'grades scores tasks' },
  { id: 'subjects',     label: 'Subjects',     icon: BookOpen,        note: 'Add and manage your subjects',              keys: 'courses' },
  { id: 'planner',      label: 'Planner',      icon: Compass,         note: 'A study route built from your syllabus',    keys: 'route roadmap syllabus' },
  { id: 'applications', label: 'Applications', icon: Inbox,           note: 'Leave requests and their status',           keys: 'leave requests medical' },
];
const FRONT_IDS = ['dashboard', 'attendance', 'calendar', 'notes', 'profile'];

const mentorNavItems = [
  { id: 'mentor-dashboard',    label: 'Dashboard', icon: LayoutDashboard, note: 'Your mentees at a glance',   keys: 'home overview' },
  { id: 'mentees',             label: 'Mentees',   icon: Users,           note: 'Everyone you mentor',        keys: 'students' },
  { id: 'mentor-applications', label: 'Inbox',     icon: Inbox,           note: 'Leave requests to review',   keys: 'applications leave' },
  { id: 'profile',             label: 'Profile',   icon: UserCircle,      note: 'Your details and mentor code', keys: 'account code theme settings' },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
const SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

export default function Layout({ currentView, onNavigate, onLogout, user, children }) {
  const role = user?.role || 'student';
  const allItems = role === 'mentor' ? mentorNavItems : studentNavItems;
  const frontItems = role === 'mentor' ? allItems : FRONT_IDS.map(id => allItems.find(i => i.id === id));
  const moreItems = role === 'mentor' ? [] : allItems.filter(i => !FRONT_IDS.includes(i.id));
  const moreActive = moreItems.find(i => i.id === currentView) || null;
  const MoreIcon = moreActive ? moreActive.icon : LayoutGrid;
  const moreLabel = moreActive ? moreActive.label : 'More';

  const { next, toggle, isNeon } = useTheme();
  const [loaderMode] = useLoaderMode();

  const [sheetOpen, setSheetOpen] = useState(false);     // phone "More" sheet
  const [moreOpen, setMoreOpen] = useState(false);       // desktop "More" popover
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(null);          // { view, duration, key }
  const seen = useRef(new Set());

  const pillRef = useRef(null);
  const moreBtnRef = useRef(null);
  const [moreX, setMoreX] = useState(0);
  const [clip, setClip] = useState(null);   // clip-path that reveals only the active item of the overlay copy
  const [clipReady, setClipReady] = useState(false);

  // ── Page loader: starts before paint so the page never flashes, plays on top of the mounting page
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (loaderMode === 'off') { setLoading(null); return; }
    const first = !seen.current.has(currentView);
    seen.current.add(currentView);
    const duration = loaderMode === 'quick' ? 450 : first ? 1800 : 750;
    setLoading({ view: currentView, duration, key: `${currentView}-${Date.now()}` });
  }, [currentView]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [loading]);

  // ── The pill holds two copies of its items. The top copy is styled as "active" and clipped to
  // the active item, so background and text colour move together as one element.
  useLayoutEffect(() => {
    const measure = () => {
      const nav = pillRef.current;
      const el = nav?.querySelector('[aria-current="page"]');
      if (moreBtnRef.current) setMoreX(moreBtnRef.current.offsetLeft + moreBtnRef.current.offsetWidth / 2);
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

  // ── Ctrl/Cmd+K opens the palette from anywhere
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setMoreOpen(false); setPaletteOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Desktop More popover: Esc or an outside press closes it
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = e => { if (e.key === 'Escape') setMoreOpen(false); };
    const onDown = e => {
      if (!e.target.closest?.('[data-more-menu]') && !moreBtnRef.current?.contains(e.target)) setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [moreOpen]);

  // ── Phone sheet: Esc closes, body scroll locked while open
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

  // Never leave a menu open across a navigation
  useEffect(() => { setSheetOpen(false); setMoreOpen(false); }, [currentView]);

  const go = (id) => { setSheetOpen(false); setMoreOpen(false); onNavigate(id); };

  const paletteItems = useMemo(() => ([
    ...allItems.map(i => ({ ...i, group: 'Pages', run: () => onNavigate(i.id) })),
    { id: 'cmd-theme', group: 'Commands', label: `Switch to ${THEME_INFO[next].name} theme`, note: 'Change how StudySync looks', icon: Palette, keys: 'appearance dark light', run: toggle },
    { id: 'cmd-out', group: 'Commands', label: 'Sign out', note: 'End this session', icon: LogOut, keys: 'logout', run: onLogout },
  ]), [allItems, next, toggle, onLogout, onNavigate]);

  const barItems = frontItems;
  const iconBtn = 'rounded-full p-2.5 text-ink-muted hover:text-ink hover:bg-ink/5';

  return (
    <div className="min-h-screen min-h-dvh bg-paper text-ink font-sans relative overflow-x-hidden">
      {isNeon ? <NeonBackdrop /> : <ContourBackdrop />}
      <OfflineBar />

      {/* Page content — bottom padding clears the fixed nav on every breakpoint */}
      <div className="relative z-10 pb-28 min-[1180px]:pb-32">
        <InstallBanner />
        <div key={currentView} className="page-enter">{children}</div>
      </div>

      {/* Full-screen loader: sits under the nav (z-45 < z-50), so you can always leave */}
      {loading && (
        <PageLoader
          key={loading.key}
          view={loading.view}
          duration={loading.duration}
          onDone={() => setLoading(l => (l && l.key === loading.key ? null : l))}
        />
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} currentView={currentView} />

      {/* ══ Mobile / tablet: bottom bar (below lg) ══ */}
      <nav
        className="min-[1180px]:hidden nav-glass fixed bottom-0 inset-x-0 z-50 border-t border-sand"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid relative" style={{ gridTemplateColumns: role === 'mentor' ? 'repeat(5, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr)) 60px' }}>
          {barItems.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] focus:outline-none focus-visible:bg-ink/5
                  ${active ? 'text-ember-dark' : 'text-ink-muted active:bg-ink/5'}`}
              >
                <span aria-hidden="true" className="absolute top-0 inset-x-4 h-0.5 bg-ember" style={{ scale: active ? '1 1' : '0 1', transition: 'scale 240ms var(--ease-out)' }} />
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-[11px] leading-none truncate max-w-full px-0.5 font-medium">{label}</span>
              </button>
            );
          })}

          {role === 'mentor' ? (
            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-ink-faint active:bg-ink/5 focus:outline-none focus-visible:bg-ink/5"
            >
              <LogOut size={18} className="flex-shrink-0" />
              <span className="text-[11px] leading-none font-medium">Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              aria-haspopup="dialog"
              className={`relative flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] focus:outline-none focus-visible:bg-ink/5
                ${moreActive ? 'text-ember-dark' : 'text-ink-muted active:bg-ink/5'}`}
            >
              <span aria-hidden="true" className="absolute top-0 inset-x-4 h-0.5 bg-ember" style={{ scale: moreActive ? '1 1' : '0 1', transition: 'scale 240ms var(--ease-out)' }} />
              <LayoutGrid size={18} className="flex-shrink-0" />
              <span className="text-[11px] leading-none font-medium">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ══ Phone "More" sheet ══ */}
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
              <p className="text-[11px] font-medium text-ink-muted">More tools</p>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close menu"
                className="p-2 -m-2 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => { setSheetOpen(false); setPaletteOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-3 mb-3 rounded-xl border border-sand bg-white text-left text-sm text-ink-muted"
            >
              <Search size={16} className="flex-shrink-0" /> Search pages and commands
            </button>

            <div className="grid grid-cols-3 gap-2">
              {moreItems.map(({ id, label, icon: Icon }) => {
                const active = currentView === id;
                return (
                  <button
                    key={id}
                    onClick={() => go(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border
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
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-sand bg-white text-ink-muted hover:text-danger hover:border-danger/30 hover:bg-danger-pale"
            >
              <LogOut size={16} />
              <span className="text-xs font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* ══ Desktop: floating pill ══ */}
      <div aria-hidden="true" className="nav-fade hidden min-[1180px]:block fixed inset-x-0 bottom-0 h-32 z-40 pointer-events-none" />
      <nav ref={pillRef} className="nav-glass hidden min-[1180px]:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-50 items-center gap-0.5 p-2 rounded-full border border-sand"
        style={{ maxWidth: 'calc(100vw - 24px)' }}>

        {frontItems.map(({ id, label, icon: Icon }) => {
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

        {moreItems.length > 0 && (
          <button
            ref={moreBtnRef}
            onClick={() => setMoreOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-current={moreActive ? 'page' : undefined}
            className={`relative flex items-center gap-2 rounded-full select-none px-3 py-3
              ${moreActive ? 'text-transparent' : 'text-ink-muted hover:text-ink hover:bg-ink/5'}`}
          >
            <MoreIcon size={16} className="flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap">{moreLabel}</span>
            <ChevronUp size={14} className={`flex-shrink-0 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        <div className="w-px h-5 bg-sand mx-1 flex-shrink-0" />

        <button onClick={() => { setMoreOpen(false); setPaletteOpen(true); }} aria-label={`Search pages (${SHORTCUT})`} title={`Search (${SHORTCUT})`} className={iconBtn}>
          <Search size={16} />
        </button>

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
            {frontItems.map(({ id, label, icon: Icon }) => (
              <span key={id} className="flex items-center gap-2 px-3 py-3 flex-shrink-0">
                <Icon size={16} className="flex-shrink-0" />
                <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              </span>
            ))}
            {moreItems.length > 0 && (
              <span className="flex items-center gap-2 px-3 py-3 flex-shrink-0">
                <MoreIcon size={16} className="flex-shrink-0" />
                <span className="text-xs font-medium whitespace-nowrap">{moreLabel}</span>
                <ChevronUp size={14} className="flex-shrink-0" />
              </span>
            )}
            <span className="w-px h-5 mx-1 flex-shrink-0" />
            <span className="p-2.5 w-[36px] flex-shrink-0" />
            <span className="p-2.5 w-[36px] flex-shrink-0" />
            <span className="px-3 py-3 flex-shrink-0 opacity-0">Sign out</span>
          </div>
        )}

        {/* More popover: grows out of its button (origin-aware), lists everything not pinned */}
        {moreOpen && isNeon && (
          <WeaponWheel items={moreItems} currentView={currentView} onPick={go} style={{ left: moreX - 154, bottom: 'calc(100% + 14px)' }} />
        )}

        {moreOpen && !isNeon && (
          <div
            data-more-menu role="menu" aria-label="More tools"
            className="anim-pop absolute bottom-full mb-4 w-[320px] p-2 rounded-2xl bg-parchment border border-sand shadow-lg"
            style={{ left: moreX - 160, transformOrigin: 'bottom center' }}
          >
            <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-ink-muted">More tools</p>
            {moreItems.map(({ id, label, note, icon: Icon }) => {
              const active = currentView === id;
              return (
                <button
                  key={id} role="menuitem" onClick={() => go(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-ember-pale' : 'hover:bg-ink/5'}`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-ember text-white' : 'bg-map text-ink-muted'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{label}</span>
                    <span className="block text-xs text-ink-muted truncate">{note}</span>
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => { setMoreOpen(false); setPaletteOpen(true); }}
              className="mt-1 w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border-t border-sand text-left text-xs text-ink-muted hover:bg-ink/5"
            >
              <span className="flex items-center gap-2"><Search size={14} /> Search everything</span>
              <kbd className="font-sans text-[11px] border border-sand rounded-md px-1.5 py-0.5">{SHORTCUT}</kbd>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}

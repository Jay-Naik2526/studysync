import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Sun, BookOpenCheck } from 'lucide-react';

// Chart and status colours as CSS values, so they follow the active theme.
export const COLORS = {
  sage: 'rgb(var(--c-sage))',
  sageDark: 'rgb(var(--c-sage-dark))',
  trail: 'rgb(var(--c-trail))',
  trailDark: 'rgb(var(--c-trail-dark))',
  caution: 'rgb(var(--c-caution))',
  danger: 'rgb(var(--c-danger))',
  ink: 'rgb(var(--c-ink))',
  inkMuted: 'rgb(var(--c-ink-muted))',
  ember: 'rgb(var(--c-ember))',
  track: 'rgb(var(--c-ink) / 0.08)',
};

const THEMES = ['atlas', 'ledger'];
// Ledger is the default. The key is versioned so everyone starts on the new default;
// a theme picked from now on is remembered.
const DEFAULT_THEME = 'ledger';
const STORAGE_KEY = 'studysync-theme-v2';
const ThemeContext = createContext({ theme: DEFAULT_THEME, isLedger: true, setTheme: () => {}, toggle: () => {} });

const read = () => {
  try { const v = localStorage.getItem(STORAGE_KEY); return THEMES.includes(v) ? v : DEFAULT_THEME; }
  catch { return DEFAULT_THEME; }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'ledger') root.setAttribute('data-theme', 'ledger'); else root.removeAttribute('data-theme');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage blocked */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'ledger' ? '#F8F7F2' : '#F4EEE0');
  }, [theme]);

  // Crossfade colours for a moment so the switch doesn't flash
  const fade = () => {
    const root = document.documentElement;
    root.classList.add('theme-fade');
    window.setTimeout(() => root.classList.remove('theme-fade'), 320);
  };
  const setTheme = useCallback(t => { fade(); setThemeState(THEMES.includes(t) ? t : DEFAULT_THEME); }, []);
  const toggle = useCallback(() => { fade(); setThemeState(t => (t === 'ledger' ? 'atlas' : 'ledger')); }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLedger: theme === 'ledger', setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/** Icon button that swaps Atlas and Ledger. `showLabel` adds the theme name beside the icon. */
export function ThemeToggle({ showLabel = false, className = '' }) {
  const { isLedger, toggle } = useTheme();
  const Icon = isLedger ? Sun : BookOpenCheck;
  const next = isLedger ? 'Atlas' : 'Ledger';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`flex items-center justify-center gap-2 text-ink-muted hover:text-ink hover:bg-ink/5 ${className}`}
    >
      <Icon size={16} className="flex-shrink-0" />
      {showLabel && <span className="text-xs font-medium whitespace-nowrap">{next} theme</span>}
    </button>
  );
}

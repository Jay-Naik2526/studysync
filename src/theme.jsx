import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Sun, BookOpenCheck, TreePalm } from 'lucide-react';

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

// Three themes. Atlas is the plain default look (no attribute); Ledger and Neon Coast set data-theme.
export const THEMES = ['atlas', 'ledger', 'neon'];
export const THEME_INFO = {
  atlas:  { name: 'Atlas',      color: '#F4EEE0', icon: Sun },
  ledger: { name: 'Ledger',     color: '#F8F7F2', icon: BookOpenCheck },
  neon:   { name: 'Neon Coast', color: '#0B0716', icon: TreePalm },
};
// Neon Coast is the default. The key is versioned so everyone starts on the current default;
// a theme picked from now on is remembered.
const DEFAULT_THEME = 'neon';
const STORAGE_KEY = 'studysync-theme-v3';

const ThemeContext = createContext({
  theme: DEFAULT_THEME, isLedger: false, isNeon: true, isStructured: true, next: 'atlas',
  setTheme: () => {}, toggle: () => {},
});

const read = () => {
  try { const v = localStorage.getItem(STORAGE_KEY); return THEMES.includes(v) ? v : DEFAULT_THEME; }
  catch { return DEFAULT_THEME; }
};
const nextOf = t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'atlas') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage blocked */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_INFO[theme].color);
  }, [theme]);

  // Crossfade colours for a moment so the switch doesn't flash
  const fade = () => {
    const root = document.documentElement;
    root.classList.add('theme-fade');
    window.setTimeout(() => root.classList.remove('theme-fade'), 320);
  };
  const setTheme = useCallback(t => { fade(); setThemeState(THEMES.includes(t) ? t : DEFAULT_THEME); }, []);
  const toggle = useCallback(() => { fade(); setThemeState(t => nextOf(t)); }, []);

  return (
    <ThemeContext.Provider value={{
      theme, isLedger: theme === 'ledger', isNeon: theme === 'neon',
      // Ledger and Neon Coast share the structured layouts (register table, main chart, ranked lists)
      isStructured: theme !== 'atlas', next: nextOf(theme), setTheme, toggle,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/** Icon button that cycles Atlas, Ledger and Neon Coast. `showLabel` adds the next theme's name. */
export function ThemeToggle({ showLabel = false, className = '' }) {
  const { next, toggle } = useTheme();
  const Icon = THEME_INFO[next].icon;
  const name = THEME_INFO[next].name;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${name} theme`}
      title={`Switch to ${name} theme`}
      className={`flex items-center justify-center gap-2 text-ink-muted hover:text-ink hover:bg-ink/5 ${className}`}
    >
      <Icon size={16} className="flex-shrink-0" />
      {showLabel && <span className="text-xs font-medium whitespace-nowrap">{name} theme</span>}
    </button>
  );
}

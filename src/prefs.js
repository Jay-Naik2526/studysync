import { useCallback, useEffect, useState } from 'react';

// Page loading animation: 'full' (cinematic on first visit, shorter after), 'quick', or 'off'.
const KEY = 'studysync-loader';
export const LOADER_MODES = ['full', 'quick', 'off'];

const read = () => {
  try { const v = localStorage.getItem(KEY); return LOADER_MODES.includes(v) ? v : 'full'; }
  catch { return 'full'; }
};

export function useLoaderMode() {
  const [mode, setModeState] = useState(read);
  const setMode = useCallback(m => {
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event('studysync-prefs'));
  }, []);
  useEffect(() => {
    const on = () => setModeState(read());
    window.addEventListener('studysync-prefs', on);
    return () => window.removeEventListener('studysync-prefs', on);
  }, []);
  return [mode, setMode];
}

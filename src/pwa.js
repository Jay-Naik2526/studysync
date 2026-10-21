import { useState, useEffect, useCallback } from 'react';

const API_CACHE = 'studysync-api';

/** Registers the service worker. Production only — in dev it would cache stale modules. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is a bonus */ });
  });
}

/**
 * Forget every cached API answer. Called on sign-in, sign-out and an expired session so
 * the next person on a shared device can never be shown the previous user's data offline.
 */
export function clearOfflineData() {
  try { if ('caches' in window) caches.delete(API_CACHE); } catch { /* ignore */ }
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

// iPhone/iPad Safari has no install prompt — the user has to use Share → Add to Home Screen.
const isIOSSafari = () => {
  const ua = window.navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
};

/** Install-to-home-screen state: a native prompt where the browser offers one, else iOS steps. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => (typeof window !== 'undefined' ? isStandalone() : false));

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
  }, [deferred]);

  const ios = typeof window !== 'undefined' && isIOSSafari();
  return {
    installed,
    canPrompt: Boolean(deferred) && !installed,
    showIOSSteps: ios && !installed,
    install,
  };
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

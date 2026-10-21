import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, WifiOff, Smartphone } from 'lucide-react';
import { useInstallPrompt, useOnlineStatus } from '../pwa';

const DISMISS_KEY = 'installBannerDismissedAt';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function wasDismissedRecently() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(t) && Date.now() - t < SNOOZE_MS;
  } catch { return false; }
}

function IOSSteps() {
  return (
    <ol className="text-xs text-ink-muted space-y-1.5 mt-2">
      <li className="flex items-center gap-2"><Share size={13} className="text-trail-dark flex-shrink-0" /> Tap the <strong className="text-ink">Share</strong> button in Safari</li>
      <li className="flex items-center gap-2"><PlusSquare size={13} className="text-trail-dark flex-shrink-0" /> Choose <strong className="text-ink">Add to Home Screen</strong></li>
    </ol>
  );
}

/** Thin strip shown while the device has no connection. */
export function OfflineBar() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="relative z-20 bg-caution-pale border-b border-caution/30 text-caution text-xs font-bold px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff size={13} /> You're offline — showing what was saved on this device. Syncing needs a connection.
    </div>
  );
}

/** Dismissible "install the app" prompt that appears once the browser says the app is installable. */
export function InstallBanner() {
  const { canPrompt, showIOSSteps, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(wasDismissedRecently);

  if (hidden || (!canPrompt && !showIOSSteps)) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
      <div className="bg-parchment border border-sand rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-ember-pale flex items-center justify-center flex-shrink-0">
          <Smartphone size={17} className="text-ember-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink">Install StudySync</p>
          <p className="text-xs text-ink-muted mt-0.5">Opens like an app from your home screen, and your last-loaded pages work offline.</p>
          {showIOSSteps && <IOSSteps />}
          {canPrompt && (
            <button onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 bg-ember text-white text-xs font-bold rounded-lg hover:bg-ember-dark transition-colors">
              <Download size={13} /> Install
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss install prompt"
          className="p-1.5 -mr-1 -mt-1 rounded-lg text-ink-faint hover:text-ink hover:bg-map flex-shrink-0">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/** Permanent version for the Profile page — always there if the banner was dismissed. */
export function InstallCard() {
  const { installed, canPrompt, showIOSSteps, install } = useInstallPrompt();
  return (
    <div className="bg-parchment border border-sand rounded-2xl p-4 sm:p-5 shadow-sm">
      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">App</p>
      <p className="text-sm font-bold text-ink flex items-center gap-2"><Smartphone size={15} className="text-ink-muted" /> StudySync on your home screen</p>
      {installed ? (
        <p className="text-xs text-sage-dark font-bold mt-1.5">Installed — you're using the app.</p>
      ) : canPrompt ? (
        <>
          <p className="text-xs text-ink-muted mt-1">Open it like any other app, full screen, with your recent pages available offline.</p>
          <button onClick={install}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-ember text-white text-xs font-bold rounded-lg hover:bg-ember-dark transition-colors">
            <Download size={13} /> Install app
          </button>
        </>
      ) : showIOSSteps ? (
        <>
          <p className="text-xs text-ink-muted mt-1">On iPhone and iPad, Safari installs apps from the Share menu:</p>
          <IOSSteps />
        </>
      ) : (
        <p className="text-xs text-ink-muted mt-1">
          Use your browser's menu and choose <strong className="text-ink">Install app</strong> (Chrome, Edge, Brave) or
          <strong className="text-ink"> Add to Home Screen</strong> (Android). It isn't offered in this browser right now.
        </p>
      )}
    </div>
  );
}

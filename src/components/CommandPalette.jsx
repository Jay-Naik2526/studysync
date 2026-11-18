import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

/**
 * Jump-anywhere palette (Ctrl/Cmd+K). Keyboard-initiated and used many times a day, so it
 * opens and closes instantly with no animation. Items: { id, label, note, icon, keys, group, run }.
 */
export default function CommandPalette({ open, onClose, items, currentView }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(i => `${i.label} ${i.note || ''} ${i.keys || ''}`.toLowerCase().includes(needle));
  }, [q, items]);

  useEffect(() => { if (open) { setQ(''); setIdx(0); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [idx]);

  if (!open) return null;

  const run = item => { onClose(); item?.run(); };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => (results.length ? (i + 1) % results.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => (results.length ? (i - 1 + results.length) % results.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[idx]); }
  };

  let lastGroup = null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Go to page">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 w-full h-full bg-ink/40 backdrop-blur-[2px] cursor-default" tabIndex={-1} />
      <div className="relative w-full max-w-lg bg-parchment border border-sand rounded-2xl shadow-lg overflow-hidden" onKeyDown={onKey}>
        <div className="flex items-center gap-3 px-4 border-b border-sand">
          <Search size={16} className="text-ink-faint flex-shrink-0" />
          <input
            ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Go to a page or run a command"
            aria-label="Search pages and commands" role="combobox" aria-expanded="true" aria-controls="cmd-list"
            className="flex-1 bg-transparent py-4 text-sm text-ink placeholder-ink-faint focus:outline-none"
          />
          <kbd className="text-[11px] text-ink-muted border border-sand rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>

        <ul id="cmd-list" ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto custom-scrollbar p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-muted">Nothing matches “{q}”</li>}
          {results.map((it, i) => {
            const showHead = it.group !== lastGroup; lastGroup = it.group;
            const Icon = it.icon;
            const active = i === idx;
            return (
              <React.Fragment key={it.id}>
                {showHead && <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-medium text-ink-muted">{it.group}</li>}
                <li role="option" aria-selected={active} data-active={active}>
                  <button
                    type="button" onClick={() => run(it)} onMouseMove={() => setIdx(i)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-ember-pale' : ''}`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-ember text-white' : 'bg-map text-ink-muted'}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{it.label}</span>
                      {it.note && <span className="block text-xs text-ink-muted truncate">{it.note}</span>}
                    </span>
                    {it.id === currentView && <span className="text-[11px] text-ink-muted">Current</span>}
                    {active && <CornerDownLeft size={14} className="text-ink-muted flex-shrink-0" />}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-sand bg-map/60 text-[11px] text-ink-muted">
          <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move</span>
          <span><kbd className="font-sans">↵</kbd> to open</span>
        </div>
      </div>
    </div>
  );
}

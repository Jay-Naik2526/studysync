import React, { useEffect, useMemo, useState } from 'react';
import { Star, Signal, Wifi, BatteryFull } from 'lucide-react';
import { loopPath } from './ContourGauge';

/* ───────────── scenery ───────────── */
function Palm({ className }) {
  const fronds = [-170, -140, -110, -80, -50, -20, 10];
  return (
    <svg viewBox="0 0 220 440" className={className} aria-hidden="true" fill="#05030B">
      <path d="M100 440 C 104 320, 108 210, 118 96" stroke="#05030B" strokeWidth="10" fill="none" strokeLinecap="round" />
      <g transform="translate(118 96)">
        {fronds.map(a => <path key={a} d="M0 0 C 34 -34, 92 -30, 128 10 C 90 -6, 40 -6, 0 0 Z" transform={`rotate(${a})`} />)}
      </g>
    </svg>
  );
}

function Sun({ className }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="neonSunG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD65A" /><stop offset="0.5" stopColor="#FF6B4A" /><stop offset="1" stopColor="#FF2E88" />
        </linearGradient>
        <mask id="neonSunM">
          <rect width="200" height="200" fill="#fff" />
          {[112, 128, 142, 154, 164, 173].map((y, i) => <rect key={y} x="0" y={y} width="200" height={2 + i * 1.6} fill="#000" />)}
        </mask>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#neonSunG)" mask="url(#neonSunM)" />
    </svg>
  );
}

/** Golden-hour sky, striped sun, swaying palms. Decorative and kept dim so content stays readable. */
export function NeonBackdrop() {
  const stars = useMemo(() => Array.from({ length: 34 }, (_, i) => ({ i, l: (i * 37.3) % 100, t: ((i * 53.7) % 100) * 0.42 })), []);
  return (
    <div className="neon-backdrop" aria-hidden="true">
      <div className="neon-stars">{stars.map(s => <span key={s.i} style={{ '--i': s.i, left: `${s.l}%`, top: `${s.t}%` }} />)}</div>
      <Sun className="neon-sun" />
      <Palm className="neon-palm l" />
      <Palm className="neon-palm r" />
    </div>
  );
}

/** Larger version for the loading screen. */
export function NeonSky() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Sun className="neon-sun" />
      <Palm className="neon-palm l" />
      <Palm className="neon-palm r" />
    </div>
  );
}

/* ───────────── HUD pieces ───────────── */
/** Wanted level: one lit star per subject below the attendance line. Lit stars flash like a siren. */
export function WantedStars({ level = 0, max = 5, className = '' }) {
  const n = Math.max(0, Math.min(max, level));
  return (
    <div className={`wanted ${className}`} data-hot={n > 0} role="img" aria-label={`Wanted level ${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => <Star key={i} className="wanted-star" data-on={i < n} fill="currentColor" strokeWidth={1.5} />)}
    </div>
  );
}

/** Health / armor style bar. */
export function HudBar({ label, value = 0, color = '#22D3C5', suffix = '%' }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 text-[11px] uppercase tracking-wider text-ink-muted">
        <span>{label}</span><span className="tabular-nums text-ink">{Math.round(v)}{suffix}</span>
      </div>
      <div className="hud-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
        <i style={{ '--v': on ? v / 100 : 0, '--c': color }} />
      </div>
    </div>
  );
}

/** Circular minimap: contour "terrain", a sweeping scan, and one blip per subject. */
export function Radar({ blips = [], size = 224 }) {
  const c = size / 2;
  const terrain = useMemo(() => [0.86, 0.68, 0.5, 0.34].map((k, i) => loopPath(c, c, c * k, i + 3)), [c]);
  const n = Math.max(blips.length, 1);
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label="Radar: one blip per subject">
      <div className="absolute inset-0 rounded-full overflow-hidden"
        style={{ background: 'radial-gradient(circle at 50% 45%, #1d1238 0%, #0b0716 100%)', boxShadow: '0 0 0 3px #05030B, 0 0 0 5px rgb(255 46 136 / 0.85), 0 22px 44px -18px #000' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, rgb(255 46 136 / 0) 0deg, rgb(255 46 136 / 0) 270deg, rgb(255 46 136 / 0.3) 360deg)', animation: 'ld-spin-kf 3.2s linear infinite' }} />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className="absolute inset-0">
          {[0.3, 0.6, 0.9].map(k => <circle key={k} cx={c} cy={c} r={c * k} style={{ stroke: 'rgb(255 255 255 / 0.07)', strokeWidth: 1 }} />)}
          <line x1={c} x2={c} y1="8" y2={size - 8} style={{ stroke: 'rgb(255 255 255 / 0.07)' }} />
          <line y1={c} y2={c} x1="8" x2={size - 8} style={{ stroke: 'rgb(255 255 255 / 0.07)' }} />
          {terrain.map((d, i) => <path key={i} d={d} style={{ stroke: 'rgb(150 120 255 / 0.28)', strokeWidth: 1.2 }} />)}
          {blips.map((b, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const r = c * (i % 2 ? 0.62 : 0.5);
            const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
            const col = b.pct >= 80 ? '#22D3C5' : b.pct >= 75 ? '#FFA84D' : '#FF4D5E';
            return (
              <g key={b.name + i}>
                <circle cx={x} cy={y} r="9" className="ld-pulse" style={{ fill: col, opacity: 0.25 }} />
                <circle cx={x} cy={y} r="4" style={{ fill: col }} />
                <text x={x} y={y - 9} textAnchor="middle" fontSize="9" style={{ fill: 'rgb(246 239 255 / 0.85)', letterSpacing: '0.04em' }}>{(b.name || '').slice(0, 4).toUpperCase()}</text>
              </g>
            );
          })}
          <path d={`M${c} ${c - 11} L${c + 8} ${c + 9} L${c} ${c + 4} L${c - 8} ${c + 9} Z`} style={{ fill: '#FF2E88', filter: 'drop-shadow(0 0 5px rgb(255 46 136 / 0.9))' }} />
          <text x={c} y="19" textAnchor="middle" fontSize="11" style={{ fill: '#fff', fontFamily: 'var(--font-display)' }}>N</text>
        </svg>
      </div>
    </div>
  );
}

/** "MISSION PASSED" / "WASTED" banner. */
export function MissionBanner({ kind = 'passed', title, sub }) {
  return (
    <div className="mission-banner" data-kind={kind} role="status" key={`${kind}-${title}`}>
      <h3>{title || (kind === 'wasted' ? 'Wasted' : 'Mission passed')}</h3>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/** Scrolling news ticker. */
export function Ticker({ items = [], tag = 'Campus news' }) {
  const list = items.length ? items : ['All quiet on campus'];
  return (
    <div className="ticker" role="marquee" aria-label={`${tag}: ${list.join('. ')}`}>
      <div className="ticker-tag">{tag}</div>
      <div className="ticker-mask" aria-hidden="true">
        <div className="ticker-track">{[...list, ...list].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>
    </div>
  );
}

/** Phone status bar: time, signal, wifi, battery. */
export function PhoneStatus() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 30000); return () => clearInterval(id); }, []);
  return (
    <div className="phone-status" aria-hidden="true">
      <span className="tabular-nums">{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      <span className="flex items-center gap-1.5"><Signal size={14} /><Wifi size={14} /><BatteryFull size={16} /></span>
    </div>
  );
}

/** The More menu as a weapon wheel. Hovering a slot shows its name and description in the hub. */
export function WeaponWheel({ items, currentView, onPick, style }) {
  const [hover, setHover] = useState(null);
  const shown = hover || items.find(i => i.id === currentView) || null;
  return (
    <div className="wheel anim-pop" role="menu" aria-label="More tools" data-more-menu style={style}>
      <div className="wheel-ring" />
      {items.map(({ id, label, icon: Icon }, i) => {
        const a = -90 + (360 / items.length) * i;
        return (
          <button
            key={id} role="menuitem" className="wheel-slot" data-active={currentView === id}
            style={{ '--a': `${a}deg`, '--i': i }} aria-label={label}
            onMouseEnter={() => setHover(items[i])} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(items[i])} onBlur={() => setHover(null)}
            onClick={() => onPick(id)}
          >
            <Icon size={20} /><span>{label}</span>
          </button>
        );
      })}
      <div className="wheel-hub">
        <b>{shown ? shown.label : 'More'}</b>
        <small>{shown ? shown.note : 'Pick a tool'}</small>
      </div>
    </div>
  );
}

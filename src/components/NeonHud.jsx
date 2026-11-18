import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star, Signal, Wifi, BatteryFull } from 'lucide-react';
import { loopPath } from './ContourGauge';
import { META, ORDER } from '../pageMeta.js';

/* ───────────── scenery: a living coastline ───────────── */

const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const todOf = d => { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 16.5 ? 'day' : h >= 16.5 && h < 19.5 ? 'dusk' : 'night'; };

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

function Sun() {
  return (
    <svg viewBox="0 0 200 200" className="nw-sun" aria-hidden="true">
      <defs>
        <linearGradient id="nwSunG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD65A" /><stop offset="0.5" stopColor="#FF6B4A" /><stop offset="1" stopColor="#FF2E88" />
        </linearGradient>
        <mask id="nwSunM">
          <rect width="200" height="200" fill="#fff" />
          {[112, 128, 142, 154, 164, 173].map((y, i) => <rect key={y} x="0" y={y} width="200" height={2 + i * 1.6} fill="#000" />)}
        </mask>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#nwSunG)" mask="url(#nwSunM)" />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 100 100" className="nw-moon" aria-hidden="true">
      <defs><mask id="nwMoonM"><rect width="100" height="100" fill="#fff" /><circle cx="64" cy="42" r="38" fill="#000" /></mask></defs>
      <circle cx="46" cy="52" r="38" fill="#FDEBD0" mask="url(#nwMoonM)" />
    </svg>
  );
}

function Cloud({ i }) {
  return (
    <svg viewBox="0 0 220 60" className="nw-cloud" style={{ '--i': i }} aria-hidden="true">
      <g fill="currentColor"><ellipse cx="70" cy="40" rx="62" ry="16" /><ellipse cx="118" cy="30" rx="46" ry="20" /><ellipse cx="156" cy="42" rx="52" ry="14" /><ellipse cx="96" cy="24" rx="30" ry="14" /></g>
    </svg>
  );
}

function Bird({ i }) {
  return (
    <svg viewBox="0 0 30 14" className="nw-bird" style={{ '--i': i }} aria-hidden="true">
      <g className="nw-wing" fill="none" stroke="#05030B" strokeWidth="1.8" strokeLinecap="round"><path d="M2 8 Q8 0 15 8 Q22 0 28 8" /></g>
    </svg>
  );
}

function Skyline() {
  const { buildings, windows } = useMemo(() => {
    const r = rng(11);
    const bs = []; let x = -10;
    while (x < 1620) { const w = 38 + r() * 64; const h = 46 + r() * 150; bs.push({ x, w, h, step: r() > 0.62, ant: r() > 0.82 }); x += w + r() * 5; }
    const ws = []; let n = 0;
    bs.forEach(b => {
      for (let cx = b.x + 8; cx < b.x + b.w - 8; cx += 13) for (let cy = 220 - b.h + 12; cy < 214; cy += 17) {
        if (r() < 0.2) { n++; ws.push({ x: cx, y: cy, flick: n % 7 === 0, hue: r() > 0.9 ? 'p' : 'w', n }); }
      }
    });
    return { buildings: bs, windows: ws };
  }, []);
  return (
    <svg viewBox="0 0 1600 220" preserveAspectRatio="xMidYMax slice" className="nw-skyline" aria-hidden="true">
      <g fill="#07040F">
        {buildings.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={220 - b.h} width={b.w} height={b.h} />
            {b.step && <rect x={b.x + b.w * 0.2} y={220 - b.h - 16} width={b.w * 0.6} height="16" />}
            {b.ant && <rect x={b.x + b.w / 2 - 1} y={220 - b.h - 38} width="2" height="38" />}
          </g>
        ))}
      </g>
      <g className="nw-windows">
        {windows.map(w => <rect key={w.n} x={w.x} y={w.y} width="5" height="8" rx="1" className={w.flick ? 'nw-flick' : ''} style={{ '--i': w.n, fill: w.hue === 'p' ? '#FF2E88' : '#FFD98A' }} />)}
      </g>
      <text x="1010" y="104" className="nw-sign" fontSize="22">NEON COAST</text>
    </svg>
  );
}

function Car({ color, dir, dur, delay, lane }) {
  return (
    <div className={`nw-car ${dir === 'l' ? 'rtl' : ''}`} style={{ '--dur': `${dur}s`, '--delay': `${delay}s`, '--lane': `${lane}px` }}>
      <svg viewBox="0 0 170 50" aria-hidden="true">
        <polygon points="150,30 170,24 170,38 150,36" fill="rgb(255 244 210 / 0.22)" />
        <ellipse cx="82" cy="46" rx="76" ry="4" fill={color} opacity="0.55" />
        <path d="M8 34 C8 26 18 22 32 20 L52 9 C57 6 63 5 72 5 L98 5 C106 5 112 8 118 13 L130 21 C142 23 150 27 150 34 L150 38 L8 38 Z" fill="#06030C" stroke={color} strokeOpacity="0.5" strokeWidth="1" />
        <path d="M58 12 L72 8 L96 8 L112 16 L112 21 L50 21 Z" fill="#1c1236" />
        <circle cx="38" cy="38" r="9" fill="#000" stroke="#2c2248" strokeWidth="2" /><circle cx="122" cy="38" r="9" fill="#000" stroke="#2c2248" strokeWidth="2" />
        <rect x="146" y="28" width="6" height="4" rx="1" fill="#FFF4D2" /><rect x="6" y="28" width="5" height="4" rx="1" fill="#FF3B4E" />
      </svg>
    </div>
  );
}

/**
 * The world behind the app. The sky follows the real time of day, windows flicker, cars drive past,
 * and layers drift with the pointer. `variant`: 'app' (fixed, full screen) or 'panel' (fills its parent).
 */
export function NeonWorld({ variant = 'app', fx = true, tod: forced }) {
  const ref = useRef(null);
  const [tod, setTod] = useState(() => forced || todOf(new Date()));
  useEffect(() => {
    if (forced) { setTod(forced); return; }
    const id = setInterval(() => setTod(todOf(new Date())), 60000);
    return () => clearInterval(id);
  }, [forced]);

  // Pointer parallax (fine pointers only, effects on, app variant)
  useEffect(() => {
    if (variant !== 'app' || !fx || !window.matchMedia?.('(pointer: fine)').matches) return;
    const el = ref.current; if (!el) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => { raf = 0; el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)); };
    const move = e => { x = (e.clientX / window.innerWidth - 0.5) * 2; y = (e.clientY / window.innerHeight - 0.5) * 2; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [variant, fx]);

  const stars = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ i, l: (i * 37.3) % 100, t: ((i * 53.7) % 100) * 0.5 })), []);
  return (
    <div ref={ref} className="neon-world" data-variant={variant} data-tod={tod} data-fx={fx ? 'on' : 'off'} aria-hidden="true">
      <div className="nw-sky" />
      <div className="nw-stars">{stars.map(s => <span key={s.i} style={{ '--i': s.i, left: `${s.l}%`, top: `${s.t}%` }} />)}</div>
      <div className="nw-layer nw-far"><Moon /><Sun />{[0, 1, 2, 3].map(i => <Cloud key={i} i={i} />)}{[0, 1, 2, 3].map(i => <Bird key={i} i={i} />)}</div>
      <div className="nw-layer nw-mid"><Skyline /></div>
      <div className="nw-water"><div className="nw-reflect">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div></div>
      <div className="nw-layer nw-near"><Palm className="nw-palm l" /><Palm className="nw-palm r" /></div>
      <div className="nw-road">
        <Car color="#FF2E88" dir="r" dur={17} delay={-4} lane={22} />
        <Car color="#22D3C5" dir="l" dur={23} delay={-13} lane={6} />
        <Car color="#FF8A3D" dir="r" dur={29} delay={-21} lane={14} />
      </div>
      <div className="nw-dim" />
      <div className="nw-film" />
    </div>
  );
}

// Kept for the loading screen and sign-in panel: golden hour, filling its parent
export function NeonSky() { return <NeonWorld variant="panel" tod="dusk" />; }
export function NeonBackdrop(props) { return <NeonWorld variant="app" {...props} />; }

/** GTA-style mission title card: slides in at the lower left, holds, slides out. */
export function MissionCard({ view, onEnd }) {
  const meta = META[view] || META.dashboard;
  const n = String(Math.max(ORDER.indexOf(view), 0) + 1).padStart(2, '0');
  useEffect(() => { const id = setTimeout(onEnd, 2500); return () => clearTimeout(id); }, [onEnd]);
  return (
    <div className="mission-card" aria-hidden="true">
      <div className="mc-inner">
        <span className="mc-kicker">Mission {n} / {String(ORDER.length).padStart(2, '0')}</span>
        <span className="mc-title">{meta.title}</span>
        <span className="mc-sub">{meta.words[0]}</span>
      </div>
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
        {[0, 1].map(i => <span key={i} className="radar-ping" style={{ '--i': i }} />)}
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

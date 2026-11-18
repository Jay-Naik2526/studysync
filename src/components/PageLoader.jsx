import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loopPath } from './ContourGauge';
import { useTheme } from '../theme.jsx';
import { NeonSky, WantedStars } from './NeonHud';
import { META, ORDER, TIPS } from '../pageMeta.js';

const L = i => ({ '--i': i });
const EMBER = { stroke: 'rgb(var(--c-ember))' };
const INK = { stroke: 'rgb(var(--c-ink))' };

// ─────────────────────────── per-page scenes ───────────────────────────
function SceneGauge() {
  const loops = useMemo(() => Array.from({ length: 7 }, (_, i) => loopPath(100, 100, 84 - i * 9.5, i + 1)), []);
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      {loops.map((d, i) => <path key={i} d={d} pathLength="1" className="ld-draw" style={{ ...L(i), ...EMBER, strokeWidth: 1.6 }} />)}
      <g className="ld-spin"><line x1="100" y1="100" x2="100" y2="16" style={{ ...EMBER, strokeWidth: 1.5 }} /><circle cx="100" cy="16" r="3.5" style={{ fill: 'rgb(var(--c-ember))' }} /></g>
      <circle cx="100" cy="100" r="4" className="ld-pulse" style={{ fill: 'rgb(var(--c-ink))' }} />
    </svg>
  );
}

function SceneRegister() {
  const widths = [64, 48, 72, 40, 58];
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none"><g transform="translate(18 20) scale(0.82)">
      <rect x="14" y="14" width="172" height="28" rx="6" className="ld-scan" style={{ fill: 'rgb(var(--c-hi) / 0.55)' }} />
      {widths.map((w, i) => {
        const y = 22 + i * 32;
        return (
          <g key={i}>
            <rect x="26" y={y} width="34" height="8" rx="4" style={{ fill: 'rgb(var(--c-ink) / 0.2)' }} />
            <rect x="70" y={y} width="80" height="8" rx="4" style={{ fill: 'rgb(var(--c-ink) / 0.1)' }} />
            <rect x="70" y={y} width={w} height="8" rx="4" className="ld-fill" style={{ ...L(i), fill: 'rgb(var(--c-ember))' }} />
            <circle cx="170" cy={y + 4} r="9" style={{ stroke: 'rgb(var(--c-sage))', strokeWidth: 1.5 }} />
            <path d={`M165.5 ${y + 4.5} l3 3 l6 -6.5`} pathLength="1" className="ld-draw" style={{ ...L(i), stroke: 'rgb(var(--c-sage))', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
          </g>
        );
      })}
    </g></svg>
  );
}

function SceneCalendar() {
  const fills = ['--c-sage-pale', '--c-sage-pale', '--c-caution-pale', '--c-danger-pale', '--c-map'];
  const edge = ['--c-sage', '--c-sage', '--c-caution', '--c-danger', '--c-sand-dark'];
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none"><g transform="translate(18 18) scale(0.82)">
      <rect x="12" y="14" width="176" height="10" rx="5" className="ld-pulse" style={{ fill: 'rgb(var(--c-ember))' }} />
      {Array.from({ length: 5 }).flatMap((_, r) => Array.from({ length: 7 }).map((__, c) => {
        const k = (r * 7 + c * 3 + r) % 5;
        return <rect key={`${r}-${c}`} x={12 + c * 26} y={36 + r * 28} width="20" height="22" rx="5" className="ld-pop"
          style={{ ...L(r + c), fill: `rgb(var(${fills[k]}))`, stroke: `rgb(var(${edge[k]}))`, strokeWidth: 1.2 }} />;
      }))}
    </g></svg>
  );
}

function SceneCounter() {
  const digits = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <defs>{[0, 1, 2].map(i => <clipPath key={i} id={`ldc${i}`}><rect x={20 + i * 58} y="62" width="48" height="76" rx="9" /></clipPath>)}</defs>
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={20 + i * 58} y="62" width="48" height="76" rx="9" style={{ fill: 'rgb(var(--c-parchment))', ...INK, strokeWidth: 1.6 }} />
          <g clipPath={`url(#ldc${i})`}>
            <g className="ld-roll" style={{ '--d': `${2.2 + i * 0.55}s` }}>
              {digits.map(k => <text key={k} x={44 + i * 58} y={62 + k * 76 + 54} textAnchor="middle" fontSize="48" style={{ fill: 'rgb(var(--c-ink))', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{k}</text>)}
            </g>
          </g>
          <line x1={20 + i * 58} x2={68 + i * 58} y1="100" y2="100" style={{ stroke: 'rgb(var(--c-ember) / 0.5)', strokeWidth: 1 }} />
        </g>
      ))}
    </svg>
  );
}

function SceneBars() {
  const hs = [50, 86, 64, 112, 92, 128];
  const pts = hs.map((h, i) => [31 + i * 28, 172 - h]);
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <line x1="14" x2="186" y1="172" y2="172" style={{ stroke: 'rgb(var(--c-ink) / 0.35)', strokeWidth: 1.4 }} />
      {hs.map((h, i) => <rect key={i} x={22 + i * 28} y={172 - h} width="18" height={h} rx="4" className="ld-rise"
        style={{ ...L(i), fill: i === 5 ? 'rgb(var(--c-ember))' : 'rgb(var(--c-ink) / 0.26)' }} />)}
      <path d={pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y - 10}`).join(' ')} pathLength="1" className="ld-draw" style={{ ...EMBER, strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round', '--i': 2 }} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y - 10} r="3.5" className="ld-pop" style={{ ...L(i * 1.4), fill: 'rgb(var(--c-parchment))', ...EMBER, strokeWidth: 1.8 }} />)}
    </svg>
  );
}

function SceneBooks() {
  const hs = [96, 120, 84, 110, 100, 90], ws = [16, 22, 14, 22, 18, 16];
  const cols = ['--c-ember', '--c-trail', '--c-sage', '--c-caution', '--c-ink', '--c-danger'];
  let x = 24;
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      {hs.map((h, i) => {
        const bx = x; x += ws[i] + 4;
        return (
          <g key={i} className="ld-book" style={{ ...L(i), transformOrigin: `${bx}px 172px` }}>
            <rect x={bx} y={172 - h} width={ws[i]} height={h} rx="3" style={{ fill: `rgb(var(${cols[i]}) / 0.9)` }} />
            <rect x={bx + 3} y={172 - h + 10} width={ws[i] - 6} height="3" rx="1.5" style={{ fill: 'rgb(255 255 255 / 0.6)' }} />
            <rect x={bx + 3} y={172 - h + 17} width={ws[i] - 6} height="3" rx="1.5" style={{ fill: 'rgb(255 255 255 / 0.4)' }} />
          </g>
        );
      })}
      <line x1="14" x2="186" y1="174" y2="174" style={{ stroke: 'rgb(var(--c-ink) / 0.4)', strokeWidth: 2.4, strokeLinecap: 'round' }} />
      <path d="M92 44 v34 l5 -5 l5 5 v-34 z" className="ld-pop" style={{ '--i': 6, fill: 'rgb(var(--c-ember))' }} />
    </svg>
  );
}

function SceneNotes() {
  const ws = [76, 58, 80, 44, 70, 52];
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <rect x="40" y="18" width="116" height="156" rx="9" style={{ fill: 'rgb(var(--c-parchment))', ...INK, strokeWidth: 1.6 }} />
      <rect x="52" y="82" width="92" height="12" rx="3" className="ld-hl" style={{ fill: 'rgb(var(--c-hi) / 0.8)' }} />
      {ws.map((w, i) => <rect key={i} x="54" y={46 + i * 20} width={w} height="6" rx="3" className="ld-type" style={{ ...L(i), fill: 'rgb(var(--c-ink) / 0.55)' }} />)}
      <rect x="130" y="148" width="3" height="14" rx="1.5" className="ld-blink" style={{ fill: 'rgb(var(--c-ember))' }} />
      <g className="ld-pencil"><path d="M0 0 l8 -22 l7 3 l-8 22 z" style={{ fill: 'rgb(var(--c-ember))' }} /><path d="M0 0 l4 -2 l-2 6 z" style={{ fill: 'rgb(var(--c-ink))' }} /></g>
    </svg>
  );
}

function ScenePlanner() {
  const route = 'M30 160 C 50 90, 90 150, 110 100 S 160 60, 172 36';
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <path d="M14 70 Q50 56 86 70 T158 70" style={{ stroke: 'rgb(var(--c-ink) / 0.14)', strokeWidth: 1.2 }} />
      <path d="M14 126 Q56 108 96 126 T186 120" style={{ stroke: 'rgb(var(--c-ink) / 0.14)', strokeWidth: 1.2 }} />
      <path d={route} pathLength="1" className="ld-draw" style={{ ...EMBER, strokeWidth: 2.4, strokeLinecap: 'round', strokeDasharray: undefined }} />
      <path d={route} style={{ stroke: 'rgb(var(--c-ink) / 0.3)', strokeWidth: 1, strokeDasharray: '3 5' }} />
      {[[30, 160, 0], [110, 100, 3], [172, 36, 6]].map(([x, y, i]) => (
        <g key={i} className="ld-drop" style={L(i)}><circle cx={x} cy={y} r="7" style={{ fill: 'rgb(var(--c-parchment))', ...EMBER, strokeWidth: 2 }} /><circle cx={x} cy={y} r="2.6" style={{ fill: 'rgb(var(--c-ember))' }} /></g>
      ))}
      <circle r="5" style={{ fill: 'rgb(var(--c-ink))' }}><animateMotion dur="2.6s" repeatCount="indefinite" path={route} /></circle>
      <g><circle cx="156" cy="158" r="22" style={{ stroke: 'rgb(var(--c-ink) / 0.4)', strokeWidth: 1.2 }} />
        <g className="ld-needle"><path d="M156 140 l5 18 h-10 z" style={{ fill: 'rgb(var(--c-ember))' }} /><path d="M156 176 l-5 -18 h10 z" style={{ fill: 'rgb(var(--c-ink) / 0.4)' }} /></g></g>
    </svg>
  );
}

function SceneEnvelope() {
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <rect x="52" y="30" width="96" height="84" rx="6" className="ld-paper" style={{ fill: 'rgb(var(--c-parchment))', ...INK, strokeWidth: 1.4 }} />
      {[0, 1, 2].map(i => <rect key={i} x="64" y={48 + i * 14} width={i === 2 ? 40 : 70} height="5" rx="2.5" className="ld-paper" style={{ fill: 'rgb(var(--c-ink) / 0.3)' }} />)}
      <rect x="30" y="84" width="140" height="86" rx="9" style={{ fill: 'rgb(var(--c-map))', ...INK, strokeWidth: 1.6 }} />
      <path d="M30 92 L100 142 L170 92" pathLength="1" className="ld-draw" style={{ ...INK, strokeWidth: 1.6, strokeLinejoin: 'round' }} />
      <g className="ld-stamp"><circle cx="146" cy="66" r="22" style={{ ...EMBER, strokeWidth: 2.4, fill: 'rgb(var(--c-parchment) / 0.9)' }} />
        <path d="M135 66 l8 8 l15 -16" style={{ ...EMBER, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></g>
    </svg>
  );
}

function SceneProfile() {
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <circle cx="100" cy="100" r="82" className="ld-spin-slow" style={{ stroke: 'rgb(var(--c-ember) / 0.6)', strokeWidth: 1.6, strokeDasharray: '4 9' }} />
      <circle cx="100" cy="18" r="5" className="ld-spin-slow" style={{ fill: 'rgb(var(--c-ember))' }} />
      <circle cx="100" cy="84" r="26" pathLength="1" className="ld-draw" style={{ ...INK, strokeWidth: 2 }} />
      <path d="M50 160 C 56 122, 144 122, 150 160" pathLength="1" className="ld-draw" style={{ ...L(2), ...INK, strokeWidth: 2, strokeLinecap: 'round' }} />
      <rect x="56" y="172" width="88" height="6" rx="3" className="ld-type" style={{ ...L(2), fill: 'rgb(var(--c-ink) / 0.5)' }} />
    </svg>
  );
}

function SceneNetwork() {
  const nodes = Array.from({ length: 6 }, (_, i) => [100 + Math.cos((i / 6) * Math.PI * 2) * 64, 100 + Math.sin((i / 6) * Math.PI * 2) * 64]);
  return (
    <svg viewBox="0 0 200 200" className="ld-scene" fill="none">
      <g className="ld-spin-slow">
        {nodes.map(([x, y], i) => <line key={i} x1="100" y1="100" x2={x} y2={y} pathLength="1" className="ld-draw" style={{ ...L(i), stroke: 'rgb(var(--c-ink) / 0.4)', strokeWidth: 1.4 }} />)}
        {nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" className="ld-pop" style={{ ...L(i), fill: 'rgb(var(--c-parchment))', ...INK, strokeWidth: 1.6 }} />)}
      </g>
      <circle cx="100" cy="100" r="14" className="ld-pulse" style={{ fill: 'rgb(var(--c-ember))' }} />
    </svg>
  );
}

const SCENES = { gauge: SceneGauge, register: SceneRegister, calendar: SceneCalendar, counter: SceneCounter, bars: SceneBars, books: SceneBooks, notes: SceneNotes, planner: ScenePlanner, envelope: SceneEnvelope, profile: SceneProfile, network: SceneNetwork };



/**
 * Full-screen loader. Mounts hidden content behind it (so data is already loading), plays for
 * `duration` ms, then irises out. Click or Esc skips. Sits under the nav, so you can always leave.
 */
export default function PageLoader({ view, duration = 1700, onDone }) {
  const meta = META[view] || META.dashboard;
  const Scene = SCENES[meta.scene];
  const { isNeon } = useTheme();
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const total = reduced ? 350 : duration;
  const [p, setP] = useState(0);
  const [phase, setPhase] = useState('in');
  const done = useRef(false);

  const leave = () => {
    if (done.current) return;
    done.current = true;
    setP(100);
    setPhase('out');
    window.setTimeout(onDone, reduced ? 160 : 680);
  };

  useEffect(() => {
    const t0 = performance.now();
    let raf;
    const tick = now => {
      if (done.current) return;
      const x = Math.min((now - t0) / total, 1);
      const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      setP(e * 100);
      if (x < 1) raf = requestAnimationFrame(tick); else leave();
    };
    raf = requestAnimationFrame(tick);
    const onKey = e => { if (e.key === 'Escape') leave(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const word = p >= 100 ? 'Ready' : meta.words[Math.min(Math.floor(p / 25), 3)];
  const lit = Math.round((p / 100) * 28);
  const sheet = String(Math.max(ORDER.indexOf(view), 0) + 1).padStart(2, '0');

  return (
    <div className="ld-root" data-phase={phase} data-neon={isNeon} onClick={leave} role="status" aria-live="polite" aria-label={`Loading ${meta.title}`}>
      {isNeon && !reduced && <NeonSky />}
      {!reduced && (
        <>
          <div className="ld-grid" aria-hidden="true" />
          <div className="ld-marquee" aria-hidden="true"><span>{`${meta.title} · `.repeat(8)}</span></div>
          <div className="ld-rings" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(i => <span key={i} style={L(i)} />)}
          </div>
        </>
      )}

      <div className="ld-hud ld-hud-tl" aria-hidden="true"><b>StudySync</b><span>{isNeon ? 'Mission' : 'Sheet'} {sheet} / {String(ORDER.length).padStart(2, '0')}</span></div>
      {isNeon
        ? <div className="ld-hud ld-hud-tr" aria-hidden="true"><WantedStars level={Math.floor(p / 20)} /></div>
        : <div className="ld-hud ld-hud-tr" aria-hidden="true"><span className="ld-dot" />Loading</div>}
      {isNeon
        ? <div className="ld-tip" aria-hidden="true"><b>Tip</b><span>{TIPS[view] || TIPS.dashboard}</span><em>Click or press Esc to skip</em></div>
        : <div className="ld-hud ld-hud-bl" aria-hidden="true">Click or press Esc to skip</div>}

      <div className="ld-center">
        {!reduced && (
          <div className="ld-stage" aria-hidden="true">
            <div className="ld-sweep" />
            <svg viewBox="0 0 260 260" className="ld-bezel"><circle cx="130" cy="130" r="124" /><circle cx="130" cy="130" r="112" className="ld-bezel-dash" /></svg>
            <i className="ld-orbit" style={{ '--r': '124px', '--t': '5s' }} />
            <i className="ld-orbit" style={{ '--r': '112px', '--t': '8s', '--rev': 'reverse' }} />
            <i className="ld-orbit" style={{ '--r': '124px', '--t': '12s', '--d': '-4s' }} />
            <Scene />
          </div>
        )}

        <h2 className="ld-title" aria-hidden="true">
          {[...meta.title].map((ch, i) => <span key={i} className="ld-letter" style={L(i)}>{ch === ' ' ? ' ' : ch}</span>)}
        </h2>
        <p key={word} className="ld-word">{word}</p>

        <div className="ld-meter" aria-hidden="true">
          <div className="ld-segs">{Array.from({ length: 28 }, (_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}</div>
          <span className="ld-pct">{Math.round(p)}<small>%</small></span>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';

// Deterministic wobbly loop: a contour line, not a circle.
export function loopPath(cx, cy, r, seed) {
  const pts = [];
  const steps = 72;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(3 * t + seed * 1.3) + 0.045 * Math.sin(5 * t + seed * 2.1) + 0.025 * Math.sin(2 * t - seed);
    pts.push([cx + Math.cos(t) * r * k, cy + Math.sin(t) * r * k * 0.92]);
  }
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
}

/**
 * Attendance as a contour map: the more you attend, the more elevation lines are reached,
 * counted from the outside in. Children render in the centre (the figure).
 */
export function ContourGauge({ pct = 0, size = 220, rings = 9, children }) {
  const c = size / 2;
  const reached = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * rings);
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(reached)); return () => cancelAnimationFrame(id); }, [reached]);

  const loops = useMemo(
    () => Array.from({ length: rings }, (_, i) => loopPath(c, c, c * 0.84 - i * ((c * 0.84 - c * 0.46) / (rings - 1)), i + 1)),
    [rings, c]
  );

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" role="img" aria-label={`Attendance ${Math.round(pct)} percent`}>
        {loops.map((d, i) => (
          <path key={i} d={d} pathLength="1" strokeLinejoin="round"
            style={{
              stroke: i < shown ? 'rgb(var(--c-ember))' : 'rgb(var(--c-ink) / 0.14)',
              strokeWidth: i < shown ? 1.75 : 1.1,
              transition: `stroke 260ms var(--ease-out) ${i * 55}ms, stroke-width 260ms var(--ease-out) ${i * 55}ms`,
            }} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Larger, quieter contour composition for empty states: one line picked out in the accent. */
export function ContourArt({ size = 112, className = '' }) {
  const loops = [0, 1, 2, 3, 4].map(i => loopPath(56, 56, 44 - i * 8, i + 4));
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" fill="none" className={className} aria-hidden="true">
      {loops.map((d, i) => (
        <path key={i} d={d} strokeLinejoin="round"
          style={{ stroke: i === 2 ? 'rgb(var(--c-ember))' : 'rgb(var(--c-ink) / 0.2)', strokeWidth: i === 2 ? 1.75 : 1.1 }} />
      ))}
      <circle cx="56" cy="56" r="2.5" style={{ fill: 'rgb(var(--c-ember))' }} />
    </svg>
  );
}

/** Signature detail: steady when idle, pulses only while a sync is actually running. */
export function SyncDot({ state = 'ok', label }) {
  return <span className="sync-dot" data-state={state} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

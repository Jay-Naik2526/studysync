import React, { useEffect, useRef, useState } from 'react';

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Eases a figure from its last value to the new one. Accepts numbers or strings with a
 * prefix/suffix such as "82.7%" and keeps the decimals; anything else renders untouched.
 */
export function CountUp({ value, duration = 800 }) {
  const m = String(value ?? '').match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  const target = m ? parseFloat(m[2]) : NaN;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const [shown, setShown] = useState(m && !prefersReduced() ? 0 : target);
  const from = useRef(m && !prefersReduced() ? 0 : target);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    if (prefersReduced()) { from.current = target; setShown(target); return; }
    const start = from.current; const t0 = performance.now(); let raf;
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1);
      const v = start + (target - start) * (1 - Math.pow(1 - p, 3));
      from.current = v; setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  if (!m) return <>{value}</>;
  return <>{m[1]}{shown.toFixed(decimals)}{m[3]}</>;
}

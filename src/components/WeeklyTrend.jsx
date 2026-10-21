import React, { useMemo, useState } from 'react';
import { weeklyTrend, parseDay } from '../utils/attendanceData';
import { ATTENDANCE_THRESHOLD } from '../constants';

const W = 640, H = 220, PAD = { l: 38, r: 14, t: 14, b: 28 };

const shortDate = key =>
  parseDay(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Running attendance % by week, with each week's own % as a dot and the 80% line. */
export default function WeeklyTrend({ records }) {
  const weeks = useMemo(() => weeklyTrend(records), [records]);
  const [active, setActive] = useState(null);

  if (weeks.length < 2) {
    return (
      <p className="text-[11px] text-ink-muted">
        The trend appears once there are at least two weeks of marked classes.
      </p>
    );
  }

  const lowest = Math.min(...weeks.map(w => Math.min(w.pct, w.cumPct)), ATTENDANCE_THRESHOLD);
  const yMin = Math.max(0, Math.floor((lowest - 8) / 10) * 10);
  const yMax = 100;
  const x = i => PAD.l + (i / (weeks.length - 1)) * (W - PAD.l - PAD.r);
  const y = v => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const line = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w.cumPct).toFixed(1)}`).join(' ');
  const ticks = [];
  for (let v = yMin; v <= yMax; v += 10) ticks.push(v);
  const labelEvery = Math.ceil(weeks.length / 7);

  const cur = active !== null ? weeks[active] : weeks[weeks.length - 1];
  const prev4 = weeks.slice(-4);
  const p4 = prev4.reduce((a, w) => a + w.present, 0);
  const m4 = prev4.reduce((a, w) => a + w.marked, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2">
        <p className="text-[11px] text-ink-muted" aria-live="polite">
          <strong className="text-ink">Week of {shortDate(cur.weekStart)}:</strong>{' '}
          {cur.present}/{cur.marked} attended ({cur.pct.toFixed(0)}%) · running total {cur.cumPct.toFixed(1)}%
        </p>
        <p className="text-[11px] text-ink-muted">
          Last 4 weeks: <strong className={(p4 / m4) * 100 < ATTENDANCE_THRESHOLD ? 'text-danger' : 'text-sage-dark'}>
            {m4 ? ((p4 / m4) * 100).toFixed(0) : '–'}%
          </strong>
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="Weekly attendance trend" onMouseLeave={() => setActive(null)}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-sand" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" className="fill-ink-faint" fontSize="10">{v}%</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(ATTENDANCE_THRESHOLD)} y2={y(ATTENDANCE_THRESHOLD)}
          className="stroke-danger" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={W - PAD.r} y={y(ATTENDANCE_THRESHOLD) - 4} textAnchor="end" className="fill-danger" fontSize="10" fontWeight="700">
          {ATTENDANCE_THRESHOLD}% required
        </text>

        <path d={line} fill="none" className="stroke-trail" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {weeks.map((w, i) => (
          <g key={w.weekStart}>
            <circle cx={x(i)} cy={y(w.pct)} r={active === i ? 5 : 3.5}
              className={w.pct < ATTENDANCE_THRESHOLD ? 'fill-danger' : 'fill-sage'} />
            <circle cx={x(i)} cy={y(w.cumPct)} r={active === i ? 4.5 : 3} className="fill-trail" />
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 9} textAnchor="middle" className="fill-ink-muted" fontSize="10">{shortDate(w.weekStart)}</text>
            )}
            {/* Wide invisible hit area so a week is easy to hover or tap */}
            <rect x={x(i) - (W - PAD.l - PAD.r) / (weeks.length - 1) / 2} y={PAD.t}
              width={(W - PAD.l - PAD.r) / (weeks.length - 1)} height={H - PAD.t - PAD.b}
              fill="transparent" onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} />
          </g>
        ))}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-trail" /> Running total</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sage" /> That week</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" /> Week below {ATTENDANCE_THRESHOLD}%</li>
      </ul>
    </div>
  );
}

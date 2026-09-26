import { useState } from 'react';
import { formatDay } from '../lib/dates';
import { zoneFor } from '../lib/gauge';
import { DataTable, useElementWidth } from './LineChart';

const ZONE_FILL = { verde: 'var(--good)', giallo: 'var(--warning)', arancio: 'var(--serious)', rosso: 'var(--critical)' };

/** Colonne delle calorie degli ultimi giorni, colorate con le stesse fasce del tachimetro. */
export function KcalWeekChart({ days, max }: { days: { date: string; kcal: number }[]; max: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const H = 150;
  const top = 18;
  const bottom = 24;
  const plotH = H - top - bottom;
  const yMax = Math.max(max * 1.15, ...days.map((d) => d.kcal));
  const band = width / days.length;
  const barW = Math.min(24, band * 0.6);
  const sy = (v: number) => top + plotH - (v / yMax) * plotH;
  const r = 4;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={H} role="img" aria-label="Calorie degli ultimi 7 giorni">
        <line x1={0} x2={width} y1={top + plotH} y2={top + plotH} stroke="var(--axis)" />
        <line x1={0} x2={width} y1={sy(max)} y2={sy(max)} stroke="var(--ink-2)" strokeWidth={1} />
        <text x={width - 2} y={sy(max) - 4} textAnchor="end" className="ref-label">
          limite {max}
        </text>
        {days.map((d, i) => {
          const cx = band * i + band / 2;
          const x = cx - barW / 2;
          const y = sy(d.kcal);
          const h = top + plotH - y;
          const isToday = i === days.length - 1;
          return (
            <g key={d.date} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} onPointerLeave={() => setActive(null)}>
              <rect x={band * i} y={0} width={band} height={H} fill="transparent" />
              {d.kcal > 0 && (
                <path
                  d={
                    h > r
                      ? `M${x} ${top + plotH} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + barW - r} Q${x + barW} ${y} ${x + barW} ${y + r} V${top + plotH} Z`
                      : `M${x} ${top + plotH} V${y} H${x + barW} V${top + plotH} Z`
                  }
                  fill={ZONE_FILL[zoneFor(d.kcal, max)]}
                  opacity={active == null || active === i ? 1 : 0.55}
                />
              )}
              {(isToday || active === i) && d.kcal > 0 && (
                <text x={cx} y={y - 5} textAnchor="middle" className="axis-label" style={{ fill: 'var(--ink)', fontWeight: 600 }}>
                  {Math.round(d.kcal)}
                </text>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className="axis-label" style={isToday ? { fill: 'var(--ink)', fontWeight: 600 } : undefined}>
                {isToday ? 'oggi' : formatDay(d.date).split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span>
          <i className="dot" style={{ background: 'var(--good)' }} />≤ {max - 400}
        </span>
        <span>
          <i className="dot" style={{ background: 'var(--warning)' }} />≤ {max - 200}
        </span>
        <span>
          <i className="dot" style={{ background: 'var(--serious)' }} />≤ {max}
        </span>
        <span>
          <i className="dot" style={{ background: 'var(--critical)' }} />oltre
        </span>
      </div>
      <DataTable head={['Giorno', 'kcal']} rows={days.map((d) => [formatDay(d.date), Math.round(d.kcal)])} />
    </div>
  );
}

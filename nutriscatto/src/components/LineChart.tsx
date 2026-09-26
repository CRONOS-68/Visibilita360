import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Series {
  id: string;
  label: string;
  color: string;
  points: Point[];
  kind: 'line' | 'dots' | 'line-dots';
  /** Se presente, colora l'area tra la linea e questo valore. */
  areaBase?: number;
}

export interface RefLine {
  y: number;
  label: string;
  color: string;
}

export interface XMarker {
  x: number;
  label: string;
}

interface Props {
  series: Series[];
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: { value: number; label: string }[];
  yTicks: number[];
  refLines?: RefLine[];
  now?: number;
  markers?: XMarker[];
  height?: number;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  ariaLabel: string;
}

export function useElementWidth<T extends HTMLElement>(fallback = 340) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

const M = { top: 12, right: 14, bottom: 26, left: 36 };

function nearestBy<T>(items: T[], score: (t: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const it of items) {
    const s = score(it);
    if (s < bestScore) {
      bestScore = s;
      best = it;
    }
  }
  return best;
}

export function LineChart({
  series,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  refLines = [],
  now,
  markers = [],
  height = 210,
  formatX,
  formatY,
  ariaLabel,
}: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hoverPx, setHoverPx] = useState<number | null>(null);
  const plotW = Math.max(10, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const sx = (x: number) => M.left + ((x - x0) / (x1 - x0 || 1)) * plotW;
  const sy = (y: number) => M.top + plotH - ((Math.min(Math.max(y, y0), y1) - y0) / (y1 - y0 || 1)) * plotH;

  const paths = useMemo(
    () =>
      series.map((s) => {
        const pts = s.points.filter((p) => p.x >= x0 && p.x <= x1);
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
        const base = s.areaBase != null ? sy(s.areaBase).toFixed(1) : null;
        const area =
          base != null && pts.length > 1
            ? `${d} L${sx(pts[pts.length - 1].x).toFixed(1)} ${base} L${sx(pts[0].x).toFixed(1)} ${base} Z`
            : null;
        return { s, pts, d, area };
      }),
    [series, width, height, x0, x1, y0, y1],
  );

  // Punto più vicino al dito/mouse per ogni serie
  const hover = useMemo(() => {
    if (hoverPx == null) return null;
    const rows: { label: string; color: string; value: string; px: number; py: number }[] = [];
    let anchorPx: number | null = null;
    for (const { s, pts } of paths) {
      if (!pts.length) continue;
      const p = nearestBy(pts, (q) => Math.abs(sx(q.x) - hoverPx));
      if (!p) continue;
      const dist = Math.abs(sx(p.x) - hoverPx);
      if (s.kind === 'dots' && dist > 22) continue;
      if (s.kind !== 'dots' && dist > Math.max(24, plotW / Math.max(pts.length, 1))) continue;
      anchorPx ??= sx(p.x);
      rows.push({ label: s.label, color: s.color, value: `${formatX(p.x)} · ${formatY(p.y)}`, px: sx(p.x), py: sy(p.y) });
    }
    const marker = nearestBy(markers, (m) => Math.abs(sx(m.x) - hoverPx));
    const markerRow = marker && Math.abs(sx(marker.x) - hoverPx) < 10 ? marker : null;
    if (!rows.length && !markerRow) return null;
    return { rows, marker: markerRow, x: anchorPx ?? (markerRow ? sx(markerRow.x) : hoverPx) };
  }, [hoverPx, paths, markers]);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPx(e.clientX - rect.left + M.left);
  };

  const tipLeft = hover ? Math.min(Math.max(hover.x, 70), width - 70) : 0;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left + plotW} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={M.left - 6} y={sy(t)} className="axis-label" textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}
        <line x1={M.left} x2={M.left + plotW} y1={M.top + plotH} y2={M.top + plotH} stroke="var(--axis)" strokeWidth={1} />
        {xTicks.map((t) => (
          <text key={t.value} x={sx(t.value)} y={height - 8} className="axis-label" textAnchor="middle">
            {t.label}
          </text>
        ))}
        {refLines.map((r) =>
          r.y >= y0 && r.y <= y1 ? (
            <g key={r.label}>
              <line x1={M.left} x2={M.left + plotW} y1={sy(r.y)} y2={sy(r.y)} stroke={r.color} strokeWidth={1.5} />
              <text x={M.left + plotW - 2} y={sy(r.y) - 5} className="ref-label" textAnchor="end">
                {r.label}
              </text>
            </g>
          ) : null,
        )}
        {now != null && now >= x0 && now <= x1 && (
          <g>
            <line x1={sx(now)} x2={sx(now)} y1={M.top} y2={M.top + plotH} stroke="var(--axis)" strokeWidth={1} />
            <text x={sx(now)} y={M.top - 2} className="axis-label" textAnchor="middle">
              ora
            </text>
          </g>
        )}
        {markers.map((m, i) =>
          m.x >= x0 && m.x <= x1 ? (
            <path
              key={`${m.x}-${i}`}
              d={`M${sx(m.x) - 5} ${M.top + plotH + 1} l5 -7 l5 7 Z`}
              fill="var(--series-2)"
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
          ) : null,
        )}
        {paths.map(({ s, area }) => (area ? <path key={`a-${s.id}`} d={area} fill={s.color} fillOpacity={0.1} /> : null))}
        {paths.map(({ s, d }) =>
          s.kind !== 'dots' && d ? (
            <path key={`l-${s.id}`} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ) : null,
        )}
        {paths.map(({ s, pts }) =>
          s.kind !== 'line'
            ? pts.map((p, i) => (
                <circle key={`d-${s.id}-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ))
            : null,
        )}
        {hover && (
          <g pointerEvents="none">
            <line x1={hover.x} x2={hover.x} y1={M.top} y2={M.top + plotH} stroke="var(--ink-2)" strokeWidth={1} />
            {hover.rows.map((r) => (
              <circle key={r.label} cx={r.px} cy={r.py} r={5} fill={r.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect
          x={M.left}
          y={0}
          width={plotW}
          height={height}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHoverPx(null)}
        />
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: tipLeft }}>
          {hover.rows.map((r) => (
            <div key={r.label}>
              <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: r.color, marginRight: 6 }} />
              {r.value} <span>{series.length > 1 ? r.label : ''}</span>
            </div>
          ))}
          {hover.marker && <div>{hover.marker.label}</div>}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; shape?: 'line' | 'dot' | 'tri' }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i className={i.shape ?? 'line'} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return null;
  return (
    <details className="table-view">
      <summary>Mostra i dati in tabella</summary>
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Tick "puliti" per un intervallo numerico. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

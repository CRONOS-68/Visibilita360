import { gaugeScaleMax, ZONE_LABEL, zoneBounds, zoneFor, type Zone } from '../lib/gauge';

const CX = 160;
const CY = 160;
const R = 120;
const BAND = 18;
const START = 150;
const SWEEP = 240;
const GAP_DEG = (2 / (2 * Math.PI * R)) * 360;

const ZONE_COLOR: Record<Zone, string> = {
  verde: 'var(--good)',
  giallo: 'var(--warning)',
  arancio: 'var(--serious)',
  rosso: 'var(--critical)',
};

function polar(angle: number, r: number) {
  const a = (angle * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function arc(a0: number, a1: number, r = R) {
  const p0 = polar(a0, r);
  const p1 = polar(a1, r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export function Gauge({ kcal, max }: { kcal: number; max: number }) {
  const scaleMax = gaugeScaleMax(max);
  const b = zoneBounds(max);
  const angleOf = (v: number) => START + (SWEEP * Math.min(Math.max(v, 0), scaleMax)) / scaleMax;
  const zone = zoneFor(kcal, max);

  const segments: { zone: Zone; from: number; to: number }[] = [
    { zone: 'verde', from: 0, to: b.green },
    { zone: 'giallo', from: b.green, to: b.yellow },
    { zone: 'arancio', from: b.yellow, to: b.orange },
    { zone: 'rosso', from: b.orange, to: scaleMax },
  ];

  const segArc = (from: number, to: number, isFirst: boolean, isLast: boolean) => {
    const a0 = angleOf(from) + (isFirst ? 0 : GAP_DEG / 2);
    const a1 = angleOf(to) - (isLast ? 0 : GAP_DEG / 2);
    return a1 > a0 ? arc(a0, a1) : null;
  };

  const majors = [0, Math.round(max / 2 / 100) * 100, b.green, b.yellow, b.orange];
  const minors: number[] = [];
  for (let v = 0; v <= scaleMax; v += 100) minors.push(v);

  const rounded = Math.round(kcal);
  const remaining = max - rounded;

  return (
    <div className="gauge-wrap">
      <div className="gauge">
        <svg viewBox="0 0 320 244" role="img" aria-label={`Calorie di oggi ${rounded} su ${max}. ${ZONE_LABEL[zone]}.`}>
          {/* Fasce di colore (traccia tenue) */}
          {segments.map((s, i) => {
            const d = segArc(s.from, s.to, i === 0, i === segments.length - 1);
            return d ? (
              <path key={s.zone} d={d} fill="none" stroke={ZONE_COLOR[s.zone]} strokeOpacity={0.22} strokeWidth={BAND} />
            ) : null;
          })}
          {/* Parte consumata, a piena intensità */}
          {segments.map((s, i) => {
            if (kcal <= s.from) return null;
            const d = segArc(s.from, Math.min(kcal, s.to), i === 0, kcal <= s.to || i === segments.length - 1);
            return d ? <path key={`f-${s.zone}`} d={d} fill="none" stroke={ZONE_COLOR[s.zone]} strokeWidth={BAND} /> : null;
          })}
          {minors.map((v) => {
            const isMajor = majors.includes(v);
            const a = angleOf(v);
            const p0 = polar(a, R - BAND / 2 - 3);
            const p1 = polar(a, R - BAND / 2 - (isMajor ? 11 : 7));
            return (
              <line
                key={v}
                x1={p0.x}
                y1={p0.y}
                x2={p1.x}
                y2={p1.y}
                stroke={isMajor ? 'var(--ink-2)' : 'var(--axis)'}
                strokeWidth={isMajor ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}
          {majors.map((v) => {
            const p = polar(angleOf(v), R - BAND / 2 - 26);
            return (
              <text key={v} x={p.x} y={p.y} className="gauge-tick-label" textAnchor="middle" dominantBaseline="middle">
                {v}
              </text>
            );
          })}
          <g className="gauge-needle" style={{ transform: `rotate(${angleOf(kcal)}deg)` }}>
            <path d={`M ${CX - 16} ${CY} L ${CX} ${CY - 4.5} L ${CX + R - BAND / 2 - 4} ${CY} L ${CX} ${CY + 4.5} Z`} fill="var(--ink)" />
          </g>
          <circle cx={CX} cy={CY} r={10} fill="var(--ink)" />
          <circle cx={CX} cy={CY} r={3.5} fill="var(--surface)" />
          <text x={CX} y={CY + 56} textAnchor="middle" className="gauge-value">
            {rounded}
          </text>
          <text x={CX} y={CY + 78} textAnchor="middle" className="gauge-unit">
            kcal su {max}
          </text>
        </svg>
      </div>
      <div className="row between" style={{ marginTop: 4 }}>
        <span className="zone-chip">
          <span className={`zone-dot zone-${zone}`} />
          {ZONE_LABEL[zone]}
        </span>
        <span className="small ink2">
          {remaining >= 0 ? (
            <>
              Restano <b className="num">{remaining}</b> kcal
            </>
          ) : (
            <>
              Oltre di <b className="num">{-remaining}</b> kcal
            </>
          )}
        </span>
      </div>
    </div>
  );
}

import type { Nutrients } from '../lib/types';

interface Row {
  label: string;
  value: number;
  ref: number;
  /** "limit" = da non superare, "goal" = da raggiungere. */
  kind: 'limit' | 'goal';
}

function state(row: Row): { cls: string; note: string } {
  const ratio = row.ref > 0 ? row.value / row.ref : 0;
  if (row.kind === 'goal') return ratio >= 1 ? { cls: 'done', note: 'raggiunto' } : { cls: '', note: '' };
  if (ratio > 1) return { cls: 'over', note: 'oltre il riferimento' };
  if (ratio >= 0.9) return { cls: 'warn', note: 'quasi al riferimento' };
  return { cls: '', note: '' };
}

export function MacroBars({ totals, refs }: { totals: Nutrients; refs: Record<'carbs' | 'sugars' | 'fat' | 'protein' | 'fiber', number> }) {
  const rows: Row[] = [
    { label: 'Carboidrati', value: totals.carbs, ref: refs.carbs, kind: 'limit' },
    { label: 'di cui zuccheri', value: totals.sugars, ref: refs.sugars, kind: 'limit' },
    { label: 'Proteine', value: totals.protein, ref: refs.protein, kind: 'goal' },
    { label: 'Grassi', value: totals.fat, ref: refs.fat, kind: 'limit' },
    { label: 'Fibre', value: totals.fiber, ref: refs.fiber, kind: 'goal' },
  ];
  return (
    <div>
      {rows.map((r) => {
        const s = state(r);
        const pct = r.ref > 0 ? Math.min(100, (r.value / r.ref) * 100) : 0;
        return (
          <div className="meter-row" key={r.label}>
            <span className="meter-label">{r.label}</span>
            <span className="meter-value num">
              <b style={{ color: 'var(--ink)' }}>{Math.round(r.value)}</b> / {r.ref} g
            </span>
            <div
              className={`meter ${s.cls}`}
              role="meter"
              aria-label={r.label}
              aria-valuemin={0}
              aria-valuemax={r.ref}
              aria-valuenow={Math.round(r.value)}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            {s.note && <span className="meter-note">{s.note}</span>}
          </div>
        );
      })}
      <p className="xsmall muted" style={{ marginTop: 10 }}>
        Proteine e fibre sono obiettivi minimi; carboidrati, zuccheri e grassi sono tetti indicativi.
      </p>
    </div>
  );
}

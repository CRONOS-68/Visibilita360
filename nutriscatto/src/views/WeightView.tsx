import { useState } from 'react';
import { Icon } from '../components/Icon';
import { DataTable, LineChart, niceTicks } from '../components/LineChart';
import { NumInput } from '../components/NumInput';
import { dateKey, formatDay, formatLongDate, startOfDay } from '../lib/dates';
import { round } from '../lib/nutrition';
import type { AppState, WeightEntry } from '../lib/types';
import { expectedWeeklyLoss, sortWeights, tdee, weightStats } from '../lib/weight';

const DAY = 86_400_000;
const fmtKg = (v: number | null, digits = 1) => (v == null ? '—' : round(v, digits).toLocaleString('it-IT'));

export function WeightView({
  state,
  today,
  onSave,
  onDelete,
  onGoto,
}: {
  state: AppState;
  today: string;
  onSave: (e: WeightEntry) => void;
  onDelete: (date: string) => void;
  onGoto: (tab: 'impostazioni') => void;
}) {
  const { settings } = state;
  const sorted = sortWeights(state.weights);
  const last = sorted[sorted.length - 1];
  const [kg, setKg] = useState<number | null>(last?.kg ?? null);
  const [date, setDate] = useState(today);
  const stats = weightStats(state.weights, settings.startWeight, settings.weightLossGoal);
  const energy = stats.current != null ? tdee(settings.profile, stats.current) : null;
  const weekly = energy != null ? expectedWeeklyLoss(energy, settings.kcalMax) : null;
  const weeksByDeficit = weekly && weekly > 0 ? stats.remaining / weekly : null;

  const points = sorted.map((w) => ({ x: startOfDay(w.date).getTime(), y: w.kg }));
  const ys = [...points.map((p) => p.y), ...(stats.target != null ? [stats.target] : [])];
  const yDomain: [number, number] = ys.length ? [Math.floor(Math.min(...ys) - 1), Math.ceil(Math.max(...ys) + 1)] : [0, 1];
  const xDomain: [number, number] = points.length
    ? [points[0].x - DAY / 2, Math.max(points[points.length - 1].x, points[0].x + 7 * DAY) + DAY / 2]
    : [0, 1];

  const valid = kg != null && kg >= 30 && kg <= 300;

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Registra il peso</h2>
        <div className="grid-2">
          <label className="field">
            Peso (kg)
            <NumInput value={kg} digits={1} placeholder="es. 78,4" onChange={setKg} />
          </label>
          <label className="field">
            Giorno
            <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
          </label>
        </div>
        <button type="button" className="btn primary" disabled={!valid} onClick={() => valid && onSave({ date, kg: round(kg, 1) })}>
          <Icon name="check" size={18} /> Salva
        </button>
        <p className="xsmall muted">Pesati sempre nelle stesse condizioni: al mattino, dopo il bagno, prima di colazione.</p>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Obiettivo −{settings.weightLossGoal} kg</h2>
          <span className="small ink2 num">{Math.round(stats.progress * 100)}%</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stats.progress * 100)}>
          <span style={{ width: `${stats.progress * 100}%` }} />
        </div>
        <div className="tiles" style={{ marginTop: 12 }}>
          <div className="tile">
            <div className="tile-label">Partenza</div>
            <div className="tile-value num">
              {fmtKg(stats.start)}
              <small>kg</small>
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Attuale</div>
            <div className="tile-value num">
              {fmtKg(stats.current)}
              <small>kg</small>
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Obiettivo</div>
            <div className="tile-value num">
              {fmtKg(stats.target)}
              <small>kg</small>
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">{stats.lost >= 0 ? 'Persi' : 'Presi'}</div>
            <div className="tile-value num">
              {fmtKg(Math.abs(stats.lost))}
              <small>kg</small>
            </div>
            <div className="tile-note">mancano {fmtKg(stats.remaining)} kg</div>
          </div>
        </div>

        {stats.start != null && (
          <div className="stack" style={{ marginTop: 12, gap: 8 }}>
            {stats.remaining <= 0 ? (
              <div className="notice good">
                <Icon name="check" size={18} />
                <span>
                  <b>Obiettivo raggiunto!</b> Ora mantieni: puoi alzare gradualmente il tetto calorico in Impostazioni.
                </span>
              </div>
            ) : (
              <>
                {stats.trendPerWeek != null && (
                  <p className="small ink2">
                    Tendenza ultime settimane:{' '}
                    <b style={{ color: 'var(--ink)' }} className="num">
                      {stats.trendPerWeek > 0 ? '+' : '−'}
                      {fmtKg(Math.abs(stats.trendPerWeek), 2)} kg/settimana
                    </b>
                    {stats.projectedDate && (
                      <>
                        {' '}
                        → obiettivo verso il <b style={{ color: 'var(--ink)' }}>{formatLongDate(stats.projectedDate)}</b>
                      </>
                    )}
                  </p>
                )}
                {weekly != null ? (
                  <p className="small ink2">
                    Con {settings.kcalMax} kcal/giorno e un consumo stimato di {Math.round(energy!)} kcal, il deficit vale circa{' '}
                    <b style={{ color: 'var(--ink)' }} className="num">
                      {fmtKg(weekly, 2)} kg/settimana
                    </b>
                    {weeksByDeficit != null && ` (−${settings.weightLossGoal} kg in circa ${Math.ceil(weeksByDeficit)} settimane)`}.
                  </p>
                ) : (
                  <button type="button" className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => onGoto('impostazioni')}>
                    Completa età, altezza e sesso per stimare i tempi →
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Diario del peso</h2>
          <span className="small ink2 num">{sorted.length} pesate</span>
        </div>
        {points.length >= 2 ? (
          <LineChart
            ariaLabel="Andamento del peso"
            height={200}
            series={[{ id: 'peso', label: 'Peso', color: 'var(--accent)', points, kind: 'line-dots' }]}
            xDomain={xDomain}
            yDomain={yDomain}
            xTicks={[points[0].x, points[points.length - 1].x].map((v) => ({ value: v, label: formatDay(dateKey(v), false) }))}
            yTicks={niceTicks(yDomain[0], yDomain[1], 4)}
            refLines={stats.target != null ? [{ y: stats.target, label: `obiettivo ${fmtKg(stats.target)}`, color: 'var(--good)' }] : []}
            formatX={(x) => formatDay(dateKey(x))}
            formatY={(y) => `${fmtKg(y)} kg`}
          />
        ) : (
          <p className="small muted">Dopo due pesate vedrai qui il grafico.</p>
        )}
        <div style={{ marginTop: 8 }}>
          {[...sorted]
            .reverse()
            .slice(0, 10)
            .map((w, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev ? w.kg - prev.kg : null;
              return (
                <div className="list-row" key={w.date}>
                  <span>{formatDay(w.date)}</span>
                  <span className="row">
                    {delta != null && (
                      <span
                        className="xsmall num"
                        style={{ color: Math.abs(delta) < 0.05 ? 'var(--ink-2)' : delta < 0 ? 'var(--good-ink)' : 'var(--critical-ink)' }}
                      >
                        {Math.abs(delta) < 0.05 ? '=' : `${delta < 0 ? '▼' : '▲'} ${fmtKg(Math.abs(delta))}`}
                      </span>
                    )}
                    <b className="num">{fmtKg(w.kg)} kg</b>
                    <button type="button" className="icon-btn plain" aria-label="Elimina pesata" onClick={() => onDelete(w.date)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </span>
                </div>
              );
            })}
        </div>
        <DataTable head={['Giorno', 'kg']} rows={sorted.map((w) => [formatDay(w.date), fmtKg(w.kg)])} />
      </section>
    </div>
  );
}

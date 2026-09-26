import { useState } from 'react';
import { Icon } from '../components/Icon';
import { DataTable, Legend, LineChart, niceTicks } from '../components/LineChart';
import { GLBadge } from '../components/MealEditor';
import { NumInput } from '../components/NumInput';
import { addDays, dateKey, formatDay, formatTime, fromLocalInput, startOfDay, toLocalInput } from '../lib/dates';
import { curveStats, fastingLabel, glucoseCurve, mealResponse, paramsFor } from '../lib/glucose';
import { dailyGLClass, mealGL, uid } from '../lib/nutrition';
import type { AppState, GlucoseEntry, GlucoseKind } from '../lib/types';

const KINDS: { value: GlucoseKind; label: string }[] = [
  { value: 'digiuno', label: 'A digiuno' },
  { value: 'pre-pasto', label: 'Prima del pasto' },
  { value: 'post-pasto', label: 'Dopo il pasto' },
  { value: 'altro', label: 'Altro' },
];

const HOUR = 3600_000;

export function GlucoseView({
  state,
  today,
  now,
  fasting,
  onAdd,
  onDelete,
}: {
  state: AppState;
  today: string;
  now: number;
  fasting: number;
  onAdd: (e: GlucoseEntry) => void;
  onDelete: (id: string) => void;
}) {
  const { settings } = state;
  const [value, setValue] = useState<number | null>(null);
  const [kind, setKind] = useState<GlucoseKind>(new Date().getHours() < 10 ? 'digiuno' : 'post-pasto');
  const [at, setAt] = useState(toLocalInput(new Date()));

  const dayStart = startOfDay(today).getTime();
  const dayEnd = dayStart + 24 * HOUR;
  const params = paramsFor(fasting);
  const mealsForCurve = state.meals.filter((m) => {
    const t = new Date(m.eatenAt).getTime();
    return t >= dayStart - 6 * HOUR && t < dayEnd;
  });
  const todayMeals = mealsForCurve
    .filter((m) => dateKey(m.eatenAt) === today)
    .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
  const curve = glucoseCurve(mealsForCurve, params, dayStart, dayEnd);
  const statsSoFar = curveStats(curve, now);
  const statsDay = curveStats(curve);
  const nowPoint = curve.filter((p) => p.t <= now).pop();
  const dayGL = todayMeals.reduce((s, m) => s + mealGL(m), 0);

  const measuredToday = state.glucose.filter((g) => dateKey(g.at) === today);
  const yMax = Math.max(160, Math.ceil((Math.max(statsDay.peak, ...measuredToday.map((g) => g.value)) + 10) / 20) * 20);
  const yMin = Math.min(70, Math.floor((Math.min(fasting, ...measuredToday.map((g) => g.value)) - 10) / 10) * 10);

  const fastingEntries = state.glucose
    .filter((g) => g.kind === 'digiuno')
    .sort((a, b) => a.at.localeCompare(b.at))
    .filter((g) => dateKey(g.at) >= addDays(today, -90));
  const fastingPoints = fastingEntries.map((g) => ({ x: new Date(g.at).getTime(), y: g.value }));
  const trendMin = fastingPoints.length ? Math.min(...fastingPoints.map((p) => p.y), settings.targetGlucose) : 80;
  const trendMax = fastingPoints.length ? Math.max(...fastingPoints.map((p) => p.y), settings.targetGlucose) : 110;
  const tY: [number, number] = [Math.floor((trendMin - 5) / 5) * 5, Math.ceil((trendMax + 5) / 5) * 5];
  const tX: [number, number] = fastingPoints.length
    ? [fastingPoints[0].x - 12 * HOUR, Math.max(fastingPoints[fastingPoints.length - 1].x + 12 * HOUR, fastingPoints[0].x + 7 * 24 * HOUR)]
    : [0, 1];

  const fl = fastingLabel(fasting);
  const gap = fasting - settings.targetGlucose;

  const submit = () => {
    if (value == null || value < 30 || value > 600) return;
    onAdd({ id: uid(), at: fromLocalInput(at).toISOString(), value: Math.round(value), kind });
    setValue(null);
    setAt(toLocalInput(new Date()));
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="section-title">
          <h2>Curva glicemica di oggi</h2>
          <span className="xsmall muted">stima</span>
        </div>
        <div className="tiles" style={{ marginBottom: 12 }}>
          <div className="tile">
            <div className="tile-label">Stimata adesso</div>
            <div className="tile-value num">
              {Math.round(nowPoint?.v ?? fasting)}
              <small>mg/dL</small>
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Picco finora</div>
            <div className="tile-value num">
              {todayMeals.length ? Math.round(statsSoFar.peak) : '—'}
              {todayMeals.length > 0 && statsSoFar.peakAt && <small>{formatTime(statsSoFar.peakAt)}</small>}
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Carico glicemico</div>
            <div className="tile-value num">
              {Math.round(dayGL)}
              <small>{dailyGLClass(dayGL)}</small>
            </div>
            <div className="tile-note">basso &lt; 80 · alto &gt; 120</div>
          </div>
          <div className="tile">
            <div className="tile-label">Minuti sopra 140</div>
            <div className="tile-value num">{Math.round(statsDay.minutesAbove140)}</div>
            <div className="tile-note">obiettivo: 0</div>
          </div>
        </div>
        <LineChart
          ariaLabel="Glicemia stimata durante la giornata"
          series={[
            {
              id: 'stima',
              label: 'Stima',
              color: 'var(--accent)',
              points: curve.map((p) => ({ x: p.t, y: p.v })),
              kind: 'line',
              areaBase: fasting,
            },
            {
              id: 'misure',
              label: 'Misurata',
              color: 'var(--series-2)',
              points: measuredToday.map((g) => ({ x: new Date(g.at).getTime(), y: g.value })),
              kind: 'dots',
            },
          ]}
          xDomain={[dayStart, dayEnd]}
          yDomain={[yMin, yMax]}
          xTicks={[0, 6, 12, 18, 24].map((h) => ({ value: dayStart + h * HOUR, label: `${h}:00` }))}
          yTicks={niceTicks(yMin, yMax, 4)}
          refLines={[
            { y: settings.targetGlucose, label: `obiettivo ${settings.targetGlucose}`, color: 'var(--good)' },
            { y: 140, label: '140', color: 'var(--warning)' },
          ]}
          now={now}
          markers={todayMeals.map((m) => ({ x: new Date(m.eatenAt).getTime(), label: `${formatTime(m.eatenAt)} ${m.name}` }))}
          formatX={(x) => formatTime(x)}
          formatY={(y) => `${Math.round(y)} mg/dL`}
        />
        <Legend
          items={[
            { label: 'Stima dai pasti', color: 'var(--accent)' },
            { label: 'Misurata col glucometro', color: 'var(--series-2)', shape: 'dot' },
            { label: 'Pasto', color: 'var(--series-2)', shape: 'tri' },
          ]}
        />
        <p className="xsmall muted" style={{ marginTop: 8 }}>
          Modello indicativo basato su indice e carico glicemico, grassi, proteine e camminate. Non sostituisce il glucometro né il parere
          medico: le misure reali che inserisci compaiono come punti per confronto.
        </p>
      </section>

      {todayMeals.length > 0 && (
        <section className="card">
          <div className="section-title">
            <h2>Impatto dei pasti</h2>
          </div>
          {todayMeals.map((m) => {
            const r = mealResponse(m, params.sensitivity);
            return (
              <div className="list-row" key={m.id}>
                <span className="grow">
                  <b>{formatTime(m.eatenAt)}</b> {m.name}
                  <br />
                  <span className="xsmall muted num">
                    picco stimato +{Math.round(r.amplitude)} mg/dL dopo ~{Math.round(r.peakMin)} min{m.walkAfter ? ' · con camminata' : ''}
                  </span>
                </span>
                <GLBadge gl={mealGL(m)} />
              </div>
            );
          })}
        </section>
      )}

      <section className="card stack">
        <h2>Registra una misurazione</h2>
        <div className="grid-2">
          <label className="field">
            Glicemia mg/dL
            <NumInput value={value} digits={0} placeholder="es. 98" onChange={setValue} />
          </label>
          <label className="field">
            Momento
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as GlucoseKind)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Quando
          <input className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <button type="button" className="btn primary" disabled={value == null || value < 30 || value > 600} onClick={submit}>
          <Icon name="plus" size={18} /> Salva misurazione
        </button>
        <p className="xsmall muted">
          Le misure a digiuno aggiornano la glicemia di riferimento del modello (ora {fasting} mg/dL).
        </p>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Glicemia a digiuno</h2>
          <span className="badge">
            <span
              className="zone-dot"
              style={{ background: fl.tone === 'good' ? 'var(--good)' : fl.tone === 'warning' ? 'var(--warning)' : 'var(--critical)' }}
            />
            {fl.label}
          </span>
        </div>
        <p className="small ink2" style={{ marginBottom: 12 }}>
          Riferimento attuale <b style={{ color: 'var(--ink)' }}>{fasting} mg/dL</b>, obiettivo <b style={{ color: 'var(--ink)' }}>{settings.targetGlucose}</b>
          {gap > 0 ? ` (mancano ${gap} mg/dL)` : ' — obiettivo raggiunto!'}
        </p>
        {fastingPoints.length >= 2 ? (
          <LineChart
              ariaLabel="Andamento della glicemia a digiuno"
              height={180}
              series={[{ id: 'digiuno', label: 'A digiuno', color: 'var(--accent)', points: fastingPoints, kind: 'line-dots' }]}
              xDomain={tX}
              yDomain={tY}
              xTicks={[tX[0] + 12 * HOUR, (tX[0] + tX[1]) / 2, tX[1] - 12 * HOUR].map((v) => ({ value: v, label: formatDay(dateKey(v), false) }))}
              yTicks={niceTicks(tY[0], tY[1], 3)}
              refLines={[{ y: settings.targetGlucose, label: `obiettivo ${settings.targetGlucose}`, color: 'var(--good)' }]}
              formatX={(x) => formatDay(dateKey(x))}
              formatY={(y) => `${Math.round(y)} mg/dL`}
            />
        ) : (
          <p className="small muted">Registra la glicemia a digiuno per qualche mattina per vedere l’andamento verso {settings.targetGlucose}.</p>
        )}
        {state.glucose.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {[...state.glucose]
              .sort((a, b) => b.at.localeCompare(a.at))
              .slice(0, 8)
              .map((g) => (
                <div className="list-row" key={g.id}>
                  <span className="num">
                    <b>{g.value}</b> mg/dL <span className="xsmall muted">· {g.kind}</span>
                  </span>
                  <span className="row">
                    <span className="xsmall muted">
                      {formatDay(dateKey(g.at))} {formatTime(g.at)}
                    </span>
                    <button type="button" className="icon-btn plain" aria-label="Elimina misurazione" onClick={() => onDelete(g.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </span>
                </div>
              ))}
          </div>
        )}
        <DataTable
          head={['Data', 'mg/dL']}
          rows={fastingEntries.map((g) => [`${formatDay(dateKey(g.at))} ${formatTime(g.at)}`, g.value])}
        />
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Per scendere a {settings.targetGlucose}</h2>
        </div>
        <ul className="tips">
          {statsDay.minutesAbove140 > 0 && (
            <li>
              <b>Oggi la stima supera 140 mg/dL</b>: nei pasti con carico glicemico alto riduci la porzione di carboidrati o sostituiscila con
              versioni integrali/legumi.
            </li>
          )}
          <li>
            <b>Ordine nel piatto</b>: prima verdure, poi proteine, per ultimi i carboidrati. Attenua il picco anche a parità di calorie.
          </li>
          <li>
            <b>10-15 minuti di camminata</b> dopo i pasti principali (segnalala con il pulsante “Camminata”).
          </li>
          <li>
            <b>Pasta al dente, pane integrale o di segale, legumi</b>: indice glicemico più basso di riso bianco, pane bianco, patate.
          </li>
          <li>
            <b>Perdere 3 kg</b> migliora la sensibilità all’insulina: è l’intervento con più effetto sulla glicemia a digiuno.
          </li>
          <li>
            <b>Cena leggera di carboidrati</b> e buon sonno: incidono sul valore della mattina dopo.
          </li>
          <li>Misura sempre a digiuno alla stessa ora, prima di caffè e colazione, per confrontare i valori.</li>
        </ul>
      </section>
    </div>
  );
}

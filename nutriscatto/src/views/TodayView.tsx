import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { KcalWeekChart } from '../components/KcalWeekChart';
import { MacroBars } from '../components/MacroBars';
import { GLBadge } from '../components/MealEditor';
import { addDays, dateKey, formatTime, startOfDay } from '../lib/dates';
import { curveStats, glucoseCurve, paramsFor } from '../lib/glucose';
import { dailyGLClass, dailyReferences, fmt, mealGL, mealNutrients, totalNutrients } from '../lib/nutrition';
import type { AppState, Meal } from '../lib/types';

const SOURCE_ICON = { foto: 'camera', barcode: 'barcode', etichetta: 'label', manuale: 'pencil' } as const;

export function TodayView({
  state,
  today,
  now,
  fasting,
  onEdit,
  onToggleWalk,
  onGoto,
}: {
  state: AppState;
  today: string;
  now: number;
  fasting: number;
  onEdit: (m: Meal) => void;
  onToggleWalk: (id: string) => void;
  onGoto: (tab: 'aggiungi' | 'glicemia' | 'peso') => void;
}) {
  const { settings } = state;
  const todayMeals = state.meals
    .filter((m) => dateKey(m.eatenAt) === today)
    .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
  const totals = totalNutrients(todayMeals);
  const lastWeight = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).pop()?.kg ?? settings.startWeight;
  const refs = dailyReferences(settings.kcalMax, lastWeight ?? null);
  const dayGL = todayMeals.reduce((s, m) => s + mealGL(m), 0);

  const dayStart = startOfDay(today).getTime();
  const recentMeals = state.meals.filter((m) => {
    const t = new Date(m.eatenAt).getTime();
    return t >= dayStart - 6 * 3600_000 && t <= now;
  });
  const curve = glucoseCurve(recentMeals, paramsFor(fasting), dayStart, Math.min(now, dayStart + 86_400_000));
  const stats = curveStats(curve);
  const glucoseNow = curve.length ? curve[curve.length - 1].v : fasting;

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, kcal: totalNutrients(state.meals.filter((m) => dateKey(m.eatenAt) === date)).kcal };
  });

  return (
    <div className="stack">
      {settings.startWeight == null && (
        <button type="button" className="notice" style={{ border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => onGoto('peso')}>
          <Icon name="scale" size={18} />
          <span>
            <b>Inserisci il tuo peso di oggi</b> per attivare l’obiettivo −{settings.weightLossGoal} kg e i riferimenti di proteine.
          </span>
        </button>
      )}

      <section className="card">
        <div className="section-title">
          <h2>Calorie di oggi</h2>
          <span className="xsmall muted">si azzera a mezzanotte</span>
        </div>
        <Gauge kcal={totals.kcal} max={settings.kcalMax} />
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Nutrienti</h2>
          <span className="xsmall muted">rispetto a {settings.kcalMax} kcal</span>
        </div>
        <MacroBars totals={totals} refs={refs} />
      </section>

      <button type="button" className="card" style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => onGoto('glicemia')}>
        <div className="section-title" style={{ marginBottom: 10 }}>
          <h2>Glicemia stimata</h2>
          <span className="small" style={{ color: 'var(--accent-ink)' }}>
            curva →
          </span>
        </div>
        <div className="tiles">
          <div className="tile">
            <div className="tile-label">Adesso</div>
            <div className="tile-value num">
              {Math.round(glucoseNow)}
              <small>mg/dL</small>
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Carico glicemico</div>
            <div className="tile-value num">
              {Math.round(dayGL)}
              <small>{dailyGLClass(dayGL)}</small>
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Picco di oggi</div>
            <div className="tile-value num">
              {todayMeals.length ? Math.round(stats.peak) : '—'}
              {todayMeals.length > 0 && stats.peakAt && <small>alle {formatTime(stats.peakAt)}</small>}
            </div>
          </div>
          <div className="tile">
            <div className="tile-label">Digiuno di riferimento</div>
            <div className="tile-value num">
              {fasting}
              <small>→ {settings.targetGlucose}</small>
            </div>
          </div>
        </div>
      </button>

      <section className="card">
        <div className="section-title">
          <h2>Pasti di oggi</h2>
          <span className="small ink2 num">{todayMeals.length}</span>
        </div>
        {todayMeals.length === 0 ? (
          <div className="stack center" style={{ padding: '8px 0' }}>
            <p className="small ink2">Nessun pasto registrato oggi.</p>
            <button type="button" className="btn primary" onClick={() => onGoto('aggiungi')}>
              <Icon name="camera" size={18} /> Aggiungi il primo pasto
            </button>
          </div>
        ) : (
          todayMeals.map((m) => {
            const n = mealNutrients(m);
            return (
              <div className="meal" key={m.id}>
                {m.thumb ? (
                  <img className="meal-thumb" src={m.thumb} alt="" />
                ) : (
                  <span className="meal-thumb">
                    <Icon name={SOURCE_ICON[m.source]} />
                  </span>
                )}
                <div className="grow">
                  <div className="row between">
                    <span className="meal-title">{m.name}</span>
                    <span className="meal-kcal num">{Math.round(n.kcal)} kcal</span>
                  </div>
                  <div className="macro-line num">
                    {formatTime(m.eatenAt)} · zuccheri {fmt(n.sugars)} g · proteine {fmt(n.protein)} g · grassi {fmt(n.fat)} g
                  </div>
                  <div className="meal-actions">
                    <GLBadge gl={mealGL(m)} />
                  </div>
                  <div className="meal-actions">
                    <button
                      type="button"
                      className="btn sm"
                      aria-pressed={m.walkAfter}
                      title="Segna se hai camminato 10-15 minuti dopo il pasto"
                      onClick={() => onToggleWalk(m.id)}
                    >
                      <Icon name={m.walkAfter ? 'check' : 'walk'} size={15} /> Camminata
                    </button>
                    <button type="button" className="btn sm" onClick={() => onEdit(m)}>
                      <Icon name="pencil" size={15} /> Modifica
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Ultimi 7 giorni</h2>
          <span className="xsmall muted num">
            media {Math.round(week.reduce((s, d) => s + d.kcal, 0) / Math.max(1, week.filter((d) => d.kcal > 0).length))} kcal
          </span>
        </div>
        <KcalWeekChart days={week} max={settings.kcalMax} />
      </section>
    </div>
  );
}

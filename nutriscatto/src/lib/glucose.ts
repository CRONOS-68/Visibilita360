import { mealGL, mealNutrients } from './nutrition';
import type { GlucoseEntry, Meal } from './types';

/*
 * Modello glicemico semplificato (stima indicativa, non un dispositivo medico).
 *
 * Ogni pasto aggiunge alla glicemia basale una risposta a campana:
 *   risposta(t) = A * (t/tp)^a * e^(a(1 - t/tp))      (vale A al tempo tp)
 * - A cresce con il carico glicemico (IG x carboidrati), con saturazione per carichi alti,
 *   ed è attenuata da grassi e proteine (svuotamento gastrico più lento).
 * - tp (tempo al picco) si allunga con grassi e proteine.
 * - una camminata di 10-15 minuti dopo il pasto riduce il picco (~30%).
 * - la sensibilità dipende dalla glicemia a digiuno: più è alta, più ampi i picchi.
 * Calibrazione: ~1 mg/dL per unità di carico glicemico in una persona con digiuno a 90.
 */

const SHAPE = 2.2;
const WALK_FACTOR = 0.7;

export interface GlucoseParams {
  baseline: number;
  sensitivity: number;
}

export interface MealResponse {
  start: number;
  amplitude: number;
  peakMin: number;
  gl: number;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function sensitivityFromFasting(fasting: number): number {
  return clamp(1 + (fasting - 90) * 0.02, 0.8, 1.6);
}

export function paramsFor(fasting: number): GlucoseParams {
  return { baseline: fasting, sensitivity: sensitivityFromFasting(fasting) };
}

export function mealResponse(meal: Meal, sensitivity: number): MealResponse {
  const n = mealNutrients(meal);
  const gl = mealGL(meal);
  const saturated = gl / (1 + gl / 120);
  const blunt = 1 / (1 + 0.004 * (n.fat + 0.5 * n.protein));
  const walk = meal.walkAfter ? WALK_FACTOR : 1;
  return {
    start: new Date(meal.eatenAt).getTime(),
    amplitude: sensitivity * saturated * blunt * walk,
    peakMin: clamp(35 + 0.5 * n.fat + 0.15 * n.protein, 30, 90),
    gl,
  };
}

/** Forma della risposta normalizzata (1 al picco). */
export function responseShape(minutesSinceMeal: number, peakMin: number): number {
  if (minutesSinceMeal <= 0) return 0;
  const x = minutesSinceMeal / peakMin;
  return x ** SHAPE * Math.exp(SHAPE * (1 - x));
}

export function glucoseAt(t: number, responses: MealResponse[], baseline: number): number {
  let v = baseline;
  for (const r of responses) v += r.amplitude * responseShape((t - r.start) / 60_000, r.peakMin);
  return v;
}

export interface CurvePoint {
  t: number;
  v: number;
}

/** Curva stimata dalle `from` alle `to` con passo in minuti. */
export function glucoseCurve(
  meals: Meal[],
  params: GlucoseParams,
  from: number,
  to: number,
  stepMin = 5,
): CurvePoint[] {
  const responses = meals.map((m) => mealResponse(m, params.sensitivity));
  const pts: CurvePoint[] = [];
  for (let t = from; t <= to; t += stepMin * 60_000) {
    pts.push({ t, v: glucoseAt(t, responses, params.baseline) });
  }
  return pts;
}

export interface CurveStats {
  peak: number;
  peakAt: number | null;
  minutesAbove140: number;
  average: number;
}

export function curveStats(curve: CurvePoint[], until = Infinity): CurveStats {
  const pts = curve.filter((p) => p.t <= until);
  if (pts.length === 0) return { peak: 0, peakAt: null, minutesAbove140: 0, average: 0 };
  let peak = -Infinity;
  let peakAt: number | null = null;
  let sum = 0;
  let above = 0;
  const step = pts.length > 1 ? (pts[1].t - pts[0].t) / 60_000 : 0;
  for (const p of pts) {
    if (p.v > peak) {
      peak = p.v;
      peakAt = p.t;
    }
    sum += p.v;
    if (p.v > 140) above += step;
  }
  return { peak, peakAt, minutesAbove140: above, average: sum / pts.length };
}

/** Ultima glicemia a digiuno misurata, altrimenti il valore di partenza. */
export function currentFasting(entries: GlucoseEntry[], fallback: number): number {
  const fasting = entries
    .filter((e) => e.kind === 'digiuno')
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return fasting.length ? fasting[0].value : fallback;
}

export function fastingLabel(v: number): { label: string; tone: 'good' | 'warning' | 'critical' } {
  if (v < 100) return { label: 'Normale', tone: 'good' };
  if (v < 126) return { label: 'Al limite (100-125)', tone: 'warning' };
  return { label: 'Elevata: parlane con il medico', tone: 'critical' };
}

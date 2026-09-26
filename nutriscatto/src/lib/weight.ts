import { daysBetween, startOfDay } from './dates';
import type { Profile, WeightEntry } from './types';

export function sortWeights(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

/** Pendenza in kg/giorno con regressione lineare sulle pesate degli ultimi `windowDays`. */
export function trendPerDay(entries: WeightEntry[], windowDays = 28): number | null {
  const sorted = sortWeights(entries);
  if (sorted.length < 2) return null;
  const last = sorted[sorted.length - 1].date;
  const recent = sorted.filter((e) => daysBetween(e.date, last) <= windowDays);
  if (recent.length < 2 || daysBetween(recent[0].date, last) < 3) return null;
  const xs = recent.map((e) => daysBetween(recent[0].date, e.date));
  const ys = recent.map((e) => e.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export interface WeightStats {
  start: number | null;
  current: number | null;
  target: number | null;
  lost: number;
  remaining: number;
  progress: number;
  trendPerWeek: number | null;
  projectedDate: Date | null;
}

export function weightStats(entries: WeightEntry[], startWeight: number | null, goal: number): WeightStats {
  const sorted = sortWeights(entries);
  const start = startWeight ?? sorted[0]?.kg ?? null;
  const current = sorted.length ? sorted[sorted.length - 1].kg : start;
  if (start == null || current == null) {
    return { start, current, target: null, lost: 0, remaining: goal, progress: 0, trendPerWeek: null, projectedDate: null };
  }
  const target = start - goal;
  const lost = start - current;
  const remaining = Math.max(0, current - target);
  const progress = goal > 0 ? Math.min(1, Math.max(0, lost / goal)) : 0;
  const slope = trendPerDay(sorted);
  let projectedDate: Date | null = null;
  if (slope != null && slope < -0.005 && remaining > 0) {
    const days = remaining / -slope;
    const base = startOfDay(sorted[sorted.length - 1].date);
    projectedDate = new Date(base.getTime() + days * 86_400_000);
  }
  return {
    start,
    current,
    target,
    lost,
    remaining,
    progress,
    trendPerWeek: slope == null ? null : slope * 7,
    projectedDate,
  };
}

/** Metabolismo basale (Mifflin-St Jeor). */
export function bmr(profile: Profile, weightKg: number): number | null {
  if (!profile.sex || !profile.age || !profile.heightCm) return null;
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === 'M' ? base + 5 : base - 161;
}

export function tdee(profile: Profile, weightKg: number): number | null {
  const b = bmr(profile, weightKg);
  return b == null ? null : b * profile.activity;
}

/** Perdita attesa in kg/settimana mangiando `intake` kcal/giorno (7700 kcal ~ 1 kg). */
export function expectedWeeklyLoss(tdeeKcal: number, intake: number): number {
  return ((tdeeKcal - intake) * 7) / 7700;
}

export const ACTIVITY_LEVELS: { value: number; label: string }[] = [
  { value: 1.2, label: 'Sedentario' },
  { value: 1.375, label: 'Leggero (1-3 allenamenti/sett.)' },
  { value: 1.55, label: 'Moderato (3-5 allenamenti/sett.)' },
  { value: 1.725, label: 'Intenso (6-7 allenamenti/sett.)' },
];

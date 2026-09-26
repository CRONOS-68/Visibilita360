import type { FoodItem, Meal, Nutrients } from './types';

export const ZERO: Nutrients = { kcal: 0, carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0 };

const KEYS = Object.keys(ZERO) as (keyof Nutrients)[];

export function scale(n: Nutrients, factor: number): Nutrients {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = n[k] * factor;
  return out;
}

export function add(a: Nutrients, b: Nutrients): Nutrients {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = a[k] + b[k];
  return out;
}

export function itemNutrients(item: FoodItem): Nutrients {
  return scale(item.per100, item.grams / 100);
}

export function mealNutrients(meal: Pick<Meal, 'items'>): Nutrients {
  return meal.items.map(itemNutrients).reduce(add, ZERO);
}

export function totalNutrients(meals: Pick<Meal, 'items'>[]): Nutrients {
  return meals.map(mealNutrients).reduce(add, ZERO);
}

/** Carico glicemico di un alimento: IG x carboidrati disponibili / 100. */
export function itemGL(item: FoodItem): number {
  return (item.gi * itemNutrients(item).carbs) / 100;
}

export function mealGL(meal: Pick<Meal, 'items'>): number {
  return meal.items.reduce((s, i) => s + itemGL(i), 0);
}

/** Classificazione standard del carico glicemico di un pasto. */
export function mealGLClass(gl: number): 'basso' | 'medio' | 'alto' {
  if (gl <= 10) return 'basso';
  if (gl < 20) return 'medio';
  return 'alto';
}

/** Classificazione del carico glicemico giornaliero. */
export function dailyGLClass(gl: number): 'basso' | 'medio' | 'alto' {
  if (gl < 80) return 'basso';
  if (gl <= 120) return 'medio';
  return 'alto';
}

/** Valori per 100 g a partire dai totali di una porzione. */
export function per100FromPortion(total: Nutrients, grams: number): Nutrients {
  return grams > 0 ? scale(total, 100 / grams) : { ...ZERO };
}

/** Riferimenti giornalieri indicativi, ricavati dal tetto calorico. */
export function dailyReferences(kcalMax: number, weightKg: number | null) {
  return {
    carbs: Math.round((kcalMax * 0.4) / 4),
    sugars: Math.round((kcalMax * 0.1) / 4),
    fat: Math.round((kcalMax * 0.3) / 9),
    // In deficit calorico proteine più alte aiutano a preservare la massa magra.
    protein: Math.round(weightKg ? weightKg * 1.2 : (kcalMax * 0.25) / 4),
    fiber: 25,
  };
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Numero in formato italiano (virgola decimale). */
export function fmt(n: number, digits = 1): string {
  return round(n, digits).toLocaleString('it-IT', { maximumFractionDigits: digits });
}

export function uid(): string {
  // crypto.randomUUID esiste solo in contesti sicuri (HTTPS/localhost).
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* contesto non sicuro */
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

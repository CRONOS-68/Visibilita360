import { describe, expect, it } from 'vitest';
import { addDays, dateKey, startOfDay } from './dates';
import { gaugeScaleMax, zoneFor } from './gauge';
import { estimateGI, giFromNutrients } from './gi';
import { curveStats, currentFasting, glucoseCurve, mealResponse, paramsFor, responseShape } from './glucose';
import { dailyReferences, itemNutrients, mealGL, per100FromPortion } from './nutrition';
import { parseOffProduct } from './openfoodfacts';
import { normalizeState, prune } from './storage';
import type { FoodItem, Meal } from './types';
import { bmr, expectedWeeklyLoss, trendPerDay, weightStats } from './weight';

const pasta: FoodItem = {
  id: 'p',
  name: 'Spaghetti al pomodoro',
  grams: 250,
  per100: { kcal: 150, carbs: 28, sugars: 2, fiber: 1.5, protein: 5, fat: 2 },
  gi: 50,
};

const meal = (items: FoodItem[], eatenAt: string, walkAfter = false): Meal => ({
  id: eatenAt,
  eatenAt,
  name: 'test',
  source: 'manuale',
  items,
  walkAfter,
});

describe('tachimetro', () => {
  it('rispetta le fasce richieste con limite 1400', () => {
    expect(zoneFor(0, 1400)).toBe('verde');
    expect(zoneFor(1000, 1400)).toBe('verde');
    expect(zoneFor(1001, 1400)).toBe('giallo');
    expect(zoneFor(1200, 1400)).toBe('giallo');
    expect(zoneFor(1201, 1400)).toBe('arancio');
    expect(zoneFor(1400, 1400)).toBe('arancio');
    expect(zoneFor(1401, 1400)).toBe('rosso');
  });
  it('lascia visibile la zona rossa', () => {
    expect(gaugeScaleMax(1400)).toBe(1750);
  });
});

describe('nutrienti', () => {
  it('scala i valori per 100 g sui grammi consumati', () => {
    const n = itemNutrients(pasta);
    expect(n.kcal).toBe(375);
    expect(n.carbs).toBe(70);
  });
  it('calcola il carico glicemico', () => {
    expect(mealGL({ items: [pasta] })).toBe(35);
  });
  it('converte i valori per porzione in valori per 100 g', () => {
    expect(per100FromPortion({ kcal: 120, carbs: 10, sugars: 8, fiber: 0, protein: 10, fat: 4 }, 150).kcal).toBeCloseTo(80);
  });
  it('ricava i riferimenti giornalieri dal tetto calorico', () => {
    const r = dailyReferences(1400, 80);
    expect(r.protein).toBe(96);
    expect(r.sugars).toBe(35);
    expect(r.fat).toBe(47);
  });
});

describe('modello glicemico', () => {
  it('la forma vale 1 al picco e torna quasi a zero dopo 4 volte il tempo al picco', () => {
    expect(responseShape(45, 45)).toBeCloseTo(1);
    expect(responseShape(0, 45)).toBe(0);
    expect(responseShape(180, 45)).toBeLessThan(0.05);
  });
  it('parte dalla glicemia a digiuno (100) e ci ritorna dopo il pasto', () => {
    const t0 = new Date('2026-09-26T13:00:00').getTime();
    const curve = glucoseCurve([meal([pasta], new Date(t0).toISOString())], paramsFor(100), t0 - 3600_000, t0 + 6 * 3600_000);
    expect(curve[0].v).toBe(100);
    expect(curve[curve.length - 1].v).toBeLessThan(101);
    const s = curveStats(curve);
    expect(s.peak).toBeGreaterThan(125);
    expect(s.peak).toBeLessThan(150);
    expect(s.peakAt! - t0).toBeGreaterThan(30 * 60_000);
  });
  it('la camminata e un digiuno più basso riducono il picco', () => {
    const at = '2026-09-26T13:00:00';
    const base = mealResponse(meal([pasta], at), paramsFor(100).sensitivity).amplitude;
    const walk = mealResponse(meal([pasta], at, true), paramsFor(100).sensitivity).amplitude;
    const better = mealResponse(meal([pasta], at), paramsFor(90).sensitivity).amplitude;
    expect(walk).toBeCloseTo(base * 0.7);
    expect(better).toBeLessThan(base);
  });
  it('grassi e proteine ritardano e attenuano il picco', () => {
    const at = '2026-09-26T13:00:00';
    const fatty = { ...pasta, per100: { ...pasta.per100, fat: 12, protein: 12 } };
    const a = mealResponse(meal([pasta], at), 1);
    const b = mealResponse(meal([fatty], at), 1);
    expect(b.amplitude).toBeLessThan(a.amplitude);
    expect(b.peakMin).toBeGreaterThan(a.peakMin);
  });
  it('usa l’ultima misura a digiuno come riferimento', () => {
    expect(currentFasting([], 100)).toBe(100);
    expect(
      currentFasting(
        [
          { id: '1', at: '2026-09-20T07:00:00Z', value: 99, kind: 'digiuno' },
          { id: '2', at: '2026-09-25T07:00:00Z', value: 96, kind: 'digiuno' },
          { id: '3', at: '2026-09-25T14:00:00Z', value: 130, kind: 'post-pasto' },
        ],
        100,
      ),
    ).toBe(96);
  });
});

describe('indice glicemico', () => {
  const n = { kcal: 350, carbs: 70, sugars: 3, fiber: 3, protein: 12, fat: 1.5 };
  it('riconosce il tipo di alimento dal nome', () => {
    expect(estimateGI('Spaghetti n.5', n)).toBe(50);
    expect(estimateGI('Fette biscottate integrali', n)).toBe(70);
    expect(estimateGI('Riso basmati', n)).toBe(58);
    expect(estimateGI('Pane integrale', n)).toBe(70);
  });
  it('usa la categoria più specifica e ignora quelle composte', () => {
    expect(estimateGI('Selezione Oro', n, ['en:plant-based-foods', 'en:cereals-and-potatoes', 'en:pastas', 'en:durum-wheat-pastas'])).toBe(50);
  });
  it('vale 0 senza carboidrati e resta in un intervallo plausibile', () => {
    expect(estimateGI('Petto di pollo', { ...n, carbs: 0 })).toBe(0);
    const gi = giFromNutrients(n);
    expect(gi).toBeGreaterThanOrEqual(25);
    expect(gi).toBeLessThanOrEqual(90);
  });
});

describe('Open Food Facts', () => {
  it('legge i valori e converte i kJ quando mancano le kcal', () => {
    const p = parseOffProduct('8076800195057', {
      status: 1,
      product: {
        product_name_it: 'Spaghetti n.5',
        brands: 'Barilla, Barilla G. e R. Fratelli',
        serving_quantity: '80',
        categories_tags: ['en:pastas'],
        nutriments: { energy_100g: 1500, carbohydrates_100g: 71, sugars_100g: 3.5, fiber_100g: 3, proteins_100g: 12.5, fat_100g: 2 },
      },
    });
    expect(p?.name).toBe('Spaghetti n.5');
    expect(p?.brand).toBe('Barilla');
    expect(p?.per100.kcal).toBeCloseTo(358.5, 0);
    expect(p?.servingGrams).toBe(80);
    expect(p?.gi).toBe(50);
    expect(p?.hasNutrition).toBe(true);
  });
  it('segnala i prodotti senza tabella nutrizionale', () => {
    expect(parseOffProduct('1', { status: 1, product: { product_name: 'X', nutriments: {} } })?.hasNutrition).toBe(false);
    expect(parseOffProduct('1', { status: 0 })).toBeNull();
  });
});

describe('peso', () => {
  const entries = [
    { date: '2026-09-01', kg: 80 },
    { date: '2026-09-08', kg: 79.5 },
    { date: '2026-09-15', kg: 79 },
    { date: '2026-09-22', kg: 78.5 },
  ];
  it('calcola tendenza e data prevista', () => {
    expect(trendPerDay(entries)! * 7).toBeCloseTo(-0.5);
    const s = weightStats(entries, 80, 3);
    expect(s.target).toBe(77);
    expect(s.lost).toBeCloseTo(1.5);
    expect(s.remaining).toBeCloseTo(1.5);
    expect(s.progress).toBeCloseTo(0.5);
    expect(dateKey(s.projectedDate!)).toBe('2026-10-13');
  });
  it('stima il deficit dal profilo', () => {
    const b = bmr({ sex: 'M', age: 45, heightCm: 178, activity: 1.375 }, 80)!;
    expect(b).toBeCloseTo(1692.5);
    expect(expectedWeeklyLoss(b * 1.375, 1400)).toBeGreaterThan(0.8);
  });
});

describe('date e memoria', () => {
  it('usa il giorno locale', () => {
    expect(dateKey(new Date(2026, 8, 26, 23, 59))).toBe('2026-09-26');
    expect(dateKey(new Date(2026, 8, 27, 0, 1))).toBe('2026-09-27');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(startOfDay('2026-09-26').getHours()).toBe(0);
  });
  it('completa i dati salvati con i valori di default', () => {
    const s = normalizeState({ settings: { kcalMax: 1500 }, meals: [{ bad: true }] });
    expect(s.settings.kcalMax).toBe(1500);
    expect(s.settings.fastingGlucose).toBe(100);
    expect(s.settings.targetGlucose).toBe(90);
    expect(s.meals).toHaveLength(0);
  });
  it('toglie le foto vecchie ma tiene i pasti', () => {
    const s = normalizeState({ meals: [{ ...meal([pasta], '2026-09-01T12:00:00'), thumb: 'data:x' }] });
    const p = prune(s, '2026-09-26');
    expect(p.meals).toHaveLength(1);
    expect(p.meals[0].thumb).toBeUndefined();
  });
});

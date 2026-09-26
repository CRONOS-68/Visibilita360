import { estimateGI } from './gi';
import type { Nutrients } from './types';

export interface OffProduct {
  code: string;
  name: string;
  brand: string;
  per100: Nutrients;
  /** true se la tabella nutrizionale è presente e ha almeno le calorie. */
  hasNutrition: boolean;
  servingGrams: number | null;
  categories: string[];
  image: string | null;
  gi: number;
}

const FIELDS = [
  'product_name',
  'product_name_it',
  'generic_name_it',
  'brands',
  'nutriments',
  'serving_quantity',
  'categories_tags',
  'image_front_small_url',
].join(',');

type Json = Record<string, unknown>;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseOffProduct(code: string, json: Json): OffProduct | null {
  if (!json || json.status !== 1 || typeof json.product !== 'object' || json.product == null) return null;
  const p = json.product as Json;
  const n = (p.nutriments ?? {}) as Json;
  const kcalDirect = num(n['energy-kcal_100g']);
  const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']); // energy_100g è in kJ
  const kcal = kcalDirect ?? (kj != null ? kj / 4.184 : null);
  const per100: Nutrients = {
    kcal: kcal ?? 0,
    carbs: num(n['carbohydrates_100g']) ?? 0,
    sugars: num(n['sugars_100g']) ?? 0,
    fiber: num(n['fiber_100g']) ?? 0,
    protein: num(n['proteins_100g']) ?? 0,
    fat: num(n['fat_100g']) ?? 0,
  };
  const name =
    [p.product_name_it, p.product_name, p.generic_name_it].find((s): s is string => typeof s === 'string' && s.trim() !== '')?.trim() ??
    `Prodotto ${code}`;
  const brand = typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : '';
  const categories = Array.isArray(p.categories_tags) ? p.categories_tags.filter((c): c is string => typeof c === 'string') : [];
  const serving = num(p.serving_quantity);
  return {
    code,
    name,
    brand,
    per100,
    hasNutrition: kcal != null,
    servingGrams: serving && serving > 0 && serving < 2000 ? serving : null,
    categories,
    image: typeof p.image_front_small_url === 'string' ? p.image_front_small_url : null,
    gi: estimateGI(name, per100, categories),
  };
}

export async function fetchProduct(code: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) throw new Error('Codice a barre non valido');
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`;
  const res = await fetch(url, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts non raggiungibile (${res.status})`);
  return parseOffProduct(clean, (await res.json()) as Json);
}

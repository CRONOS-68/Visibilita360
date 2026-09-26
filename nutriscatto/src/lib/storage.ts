import { addDays, dateKey } from './dates';
import type { AppState, Settings } from './types';

const KEY = 'nutriscatto:v1';
const THUMB_DAYS = 14;
const HISTORY_DAYS = 400;

export const DEFAULT_SETTINGS: Settings = {
  kcalMax: 1400,
  fastingGlucose: 100,
  targetGlucose: 90,
  startWeight: null,
  weightLossGoal: 3,
  profile: { sex: '', age: null, heightCm: null, activity: 1.375 },
  appToken: '',
};

export function emptyState(): AppState {
  return { version: 1, settings: structuredClone(DEFAULT_SETTINGS), meals: [], weights: [], glucose: [] };
}

/** Unisce dati salvati (anche parziali o di versioni precedenti) con i valori di default. */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  const settings = { ...base.settings, ...(r.settings ?? {}) };
  settings.profile = { ...base.settings.profile, ...(r.settings?.profile ?? {}) };
  return {
    version: 1,
    settings,
    meals: Array.isArray(r.meals) ? r.meals.filter((m) => m && Array.isArray(m.items) && m.eatenAt) : [],
    weights: Array.isArray(r.weights) ? r.weights.filter((w) => w && typeof w.kg === 'number' && w.date) : [],
    glucose: Array.isArray(r.glucose) ? r.glucose.filter((g) => g && typeof g.value === 'number' && g.at) : [],
  };
}

/** Toglie le foto più vecchie di 14 giorni e lo storico oltre ~13 mesi, per restare nei limiti di memoria. */
export function prune(state: AppState, today = dateKey(new Date())): AppState {
  const thumbLimit = addDays(today, -THUMB_DAYS);
  const historyLimit = addDays(today, -HISTORY_DAYS);
  return {
    ...state,
    meals: state.meals
      .filter((m) => dateKey(m.eatenAt) >= historyLimit)
      .map((m) => (m.thumb && dateKey(m.eatenAt) < thumbLimit ? { ...m, thumb: undefined } : m)),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? prune(normalizeState(JSON.parse(raw))) : emptyState();
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // Memoria piena: riprova senza foto.
    try {
      const slim = { ...state, meals: state.meals.map((m) => ({ ...m, thumb: undefined })) };
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* niente da fare */
    }
    return false;
  }
}

/** Chiede al browser di non cancellare i dati (utile soprattutto su iPhone). */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* non supportato */
  }
}

export function exportBackup(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutriscatto-backup-${dateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text());
  if (!parsed || typeof parsed !== 'object' || !('settings' in parsed)) {
    throw new Error('Il file non sembra un backup di NutriScatto');
  }
  return normalizeState(parsed);
}

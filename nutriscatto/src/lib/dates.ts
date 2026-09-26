const pad = (n: number) => String(n).padStart(2, '0');

/** Chiave del giorno locale, es. "2026-09-26". */
export function dateKey(d: Date | string | number): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** Mezzanotte locale del giorno indicato dalla chiave. */
export function startOfDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function addDays(key: string, days: number): string {
  const d = startOfDay(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export function formatTime(iso: string | number | Date): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function formatDay(key: string, withWeekday = true): string {
  const d = startOfDay(key);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withWeekday ? `${WEEKDAYS[d.getDay()]} ${base}` : base;
}

export function formatLongDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Valore per <input type="datetime-local">. */
export function toLocalInput(d: Date | string): string {
  const x = new Date(d);
  return `${dateKey(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function fromLocalInput(v: string): Date {
  return new Date(v);
}

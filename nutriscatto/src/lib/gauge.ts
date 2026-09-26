export type Zone = 'verde' | 'giallo' | 'arancio' | 'rosso';

/**
 * Fasce del tachimetro, relative al tetto giornaliero (1400 di default):
 * verde fino a max-400 (1000), giallo fino a max-200 (1200),
 * arancio fino a max (1400), rosso oltre.
 */
export function zoneBounds(max: number) {
  return { green: max - 400, yellow: max - 200, orange: max };
}

export function zoneFor(kcal: number, max: number): Zone {
  const b = zoneBounds(max);
  if (kcal <= b.green) return 'verde';
  if (kcal <= b.yellow) return 'giallo';
  if (kcal <= b.orange) return 'arancio';
  return 'rosso';
}

export const ZONE_LABEL: Record<Zone, string> = {
  verde: 'Zona verde',
  giallo: 'Zona gialla',
  arancio: 'Zona arancio',
  rosso: 'Oltre il limite',
};

/** Fondo scala del tachimetro: lascia visibile un tratto di zona rossa. */
export function gaugeScaleMax(max: number): number {
  return Math.ceil((max * 1.25) / 50) * 50;
}

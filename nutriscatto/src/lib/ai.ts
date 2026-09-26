import { uid } from './nutrition';
import type { Confidence, FoodItem } from './types';

export type AnalyzeMode = 'piatto' | 'etichetta';

export interface AnalyzeResult {
  isFood: boolean;
  dishName: string;
  items: FoodItem[];
  notes: string;
}

interface ApiItem {
  name: string;
  grams: number;
  per100: FoodItem['per100'];
  gi: number;
  confidence: Confidence;
}

interface ApiResult {
  isFood: boolean;
  dishName: string;
  items: ApiItem[];
  notes: string;
}

export class AiError extends Error {}

export async function analyzePhoto(
  base64: string,
  mode: AnalyzeMode,
  hint: string,
  token: string,
): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { 'x-app-token': token } : {}) },
      body: JSON.stringify({ image: base64, mediaType: 'image/jpeg', mode, hint }),
    });
  } catch {
    throw new AiError('Server non raggiungibile: controlla la connessione.');
  }
  const body = (await res.json().catch(() => ({}))) as Partial<ApiResult> & { error?: string };
  if (!res.ok) throw new AiError(body.error ?? `Errore del server (${res.status})`);
  return {
    isFood: body.isFood ?? true,
    dishName: body.dishName ?? '',
    notes: body.notes ?? '',
    items: (body.items ?? []).map((i) => ({ ...i, id: uid() })),
  };
}

export interface ServerHealth {
  ok: boolean;
  ai: boolean;
  tokenRequired: boolean;
  model?: string;
}

export async function serverHealth(): Promise<ServerHealth | null> {
  try {
    const res = await fetch('/api/health');
    return res.ok ? ((await res.json()) as ServerHealth) : null;
  } catch {
    return null;
  }
}

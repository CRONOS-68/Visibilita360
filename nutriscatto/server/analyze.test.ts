import { describe, expect, it } from 'vitest';
import { AnalysisError, createAnalyzer, normalizeAnalysis } from './analyze.mjs';

const sample = {
  is_food: true,
  dish_name: 'Spaghetti al pomodoro',
  items: [
    {
      name: 'Spaghetti cotti',
      grams: 220.4,
      per_100g: { kcal: 158, carbs_g: 30, sugars_g: 45, fiber_g: 1.8, protein_g: 5.8, fat_g: 0.9 },
      glycemic_index: 50,
      confidence: 'media',
    },
    {
      name: 'Olio',
      grams: -5,
      per_100g: { kcal: 899, carbs_g: 0, sugars_g: 0, fiber_g: 0, protein_g: 0, fat_g: 100 },
      glycemic_index: 0,
      confidence: 'strana',
    },
  ],
  notes: 'Porzione stimata dal piatto fondo.',
};

describe('normalizeAnalysis', () => {
  it('converte il formato del modello e scarta valori impossibili', () => {
    const r = normalizeAnalysis(sample);
    expect(r.isFood).toBe(true);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].grams).toBe(220);
    expect(r.items[0].per100.carbs).toBe(30);
    expect(r.items[0].per100.sugars).toBe(30); // gli zuccheri non superano i carboidrati
    expect(r.items[0].gi).toBe(50);
  });
  it('segna come non cibo se non ci sono alimenti validi', () => {
    expect(normalizeAnalysis({ ...sample, items: [] }).isFood).toBe(false);
  });
});

describe('createAnalyzer', () => {
  const fakeClient = (response: unknown, capture: { params?: Record<string, unknown> } = {}) =>
    ({
      beta: {
        messages: {
          parse: async (params: Record<string, unknown>) => {
            capture.params = params;
            return response;
          },
        },
      },
    }) as never;

  it('invia immagine, modalità e indicazioni e restituisce il risultato normalizzato', async () => {
    const capture: { params?: Record<string, unknown> } = {};
    const analyze = createAnalyzer({
      client: fakeClient({ stop_reason: 'end_turn', parsed_output: sample }, capture),
      model: 'claude-opus-5',
      effort: 'medium',
    });
    const r = await analyze({ image: 'AAAA', mode: 'piatto', hint: 'piatto fondo' });
    expect(r.dishName).toBe('Spaghetti al pomodoro');
    const p = capture.params as {
      model: string;
      fallbacks: string;
      messages: { content: { type: string; text?: string }[] }[];
      output_config: { effort: string };
    };
    expect(p.model).toBe('claude-opus-5');
    expect(p.fallbacks).toBe('default');
    expect(p.output_config.effort).toBe('medium');
    expect(p.messages[0].content[0].type).toBe('image');
    expect(p.messages[0].content[1].text).toContain('piatto fondo');
  });

  it('gestisce il rifiuto del modello', async () => {
    const analyze = createAnalyzer({ client: fakeClient({ stop_reason: 'refusal', parsed_output: null }) });
    await expect(analyze({ image: 'AAAA' })).rejects.toBeInstanceOf(AnalysisError);
  });
});

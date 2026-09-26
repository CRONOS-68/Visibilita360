import { describe, expect, it } from 'vitest';
import { AnalysisError, createClaudeAnalyzer, createOpenAIAnalyzer, normalizeAnalysis, resolveProvider } from './analyze.mjs';

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

describe('createClaudeAnalyzer', () => {
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
    const analyze = createClaudeAnalyzer({
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
    const analyze = createClaudeAnalyzer({ client: fakeClient({ stop_reason: 'refusal', parsed_output: null }) });
    await expect(analyze({ image: 'AAAA' })).rejects.toBeInstanceOf(AnalysisError);
  });
});

describe('createOpenAIAnalyzer', () => {
  const fakeClient = (response: unknown, capture: { params?: Record<string, unknown> } = {}) =>
    ({
      chat: {
        completions: {
          parse: async (params: Record<string, unknown>) => {
            capture.params = params;
            return response;
          },
        },
      },
    }) as never;

  it('invia la foto come data URL con output strutturato', async () => {
    const capture: { params?: Record<string, unknown> } = {};
    const analyze = createOpenAIAnalyzer({
      client: fakeClient({ choices: [{ message: { refusal: null, parsed: sample } }] }, capture),
      model: 'gpt-5.5',
      effort: 'medium',
    });
    const r = await analyze({ image: 'AAAA', mode: 'etichetta', hint: '' });
    expect(r.items[0].name).toBe('Spaghetti cotti');
    const p = capture.params as {
      model: string;
      reasoning_effort?: string;
      response_format: { type: string; json_schema: { strict: boolean } };
      messages: { role: string; content: unknown }[];
    };
    expect(p.model).toBe('gpt-5.5');
    expect(p.reasoning_effort).toBe('medium');
    expect(p.response_format.type).toBe('json_schema');
    expect(p.response_format.json_schema.strict).toBe(true);
    expect(p.messages[0].role).toBe('system');
    expect(String(p.messages[0].content)).toContain('tabelle nutrizionali');
    const parts = p.messages[1].content as { type: string; image_url?: { url: string }; text?: string }[];
    expect(parts[0].image_url?.url).toBe('data:image/jpeg;base64,AAAA');
    expect(parts[1].text).toBe('Leggi questa etichetta.');
  });

  it('non invia reasoning_effort se vuoto e gestisce il rifiuto', async () => {
    const capture: { params?: Record<string, unknown> } = {};
    const analyze = createOpenAIAnalyzer({
      client: fakeClient({ choices: [{ message: { refusal: 'no', parsed: null } }] }, capture),
      model: 'gpt-4.1',
      effort: '',
    });
    await expect(analyze({ image: 'AAAA' })).rejects.toBeInstanceOf(AnalysisError);
    expect(capture.params).not.toHaveProperty('reasoning_effort');
  });
});

describe('resolveProvider', () => {
  it('sceglie in base alle chiavi presenti', () => {
    expect(resolveProvider({})).toBeNull();
    expect(resolveProvider({ OPENAI_API_KEY: 'x' })).toBe('openai');
    expect(resolveProvider({ ANTHROPIC_API_KEY: 'x' })).toBe('anthropic');
    expect(resolveProvider({ ANTHROPIC_API_KEY: 'x', OPENAI_API_KEY: 'y', AI_PROVIDER: 'openai' })).toBe('openai');
    expect(resolveProvider({ AI_PROVIDER: 'openai' })).toBeNull();
  });
});

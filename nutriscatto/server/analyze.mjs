import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod';

const Per100 = z.object({
  kcal: z.number(),
  carbs_g: z.number(),
  sugars_g: z.number(),
  fiber_g: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
});

export const AnalysisSchema = z.object({
  is_food: z.boolean(),
  dish_name: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
      per_100g: Per100,
      glycemic_index: z.number(),
      confidence: z.enum(['alta', 'media', 'bassa']),
    }),
  ),
  notes: z.string(),
});

const COMMON = `Rispondi sempre in italiano.
Valori nutrizionali:
- per_100g si riferisce all'alimento nello stato in cui è mostrato (cotto se cotto, con il suo condimento se è mescolato).
- carbs_g sono i carboidrati disponibili, fibra ESCLUSA, come nelle etichette europee; sugars_g è la parte di zuccheri; fiber_g a parte.
- glycemic_index è l'indice glicemico tipico (glucosio = 100) dell'alimento così preparato; 0 per alimenti senza carboidrati (carne, pesce, uova, olio).
- confidence: quanto sei sicuro di identificazione e quantità.
Se l'immagine non mostra cibo o un'etichetta alimentare: is_food = false, items vuoto, e spiega in notes.`;

const PROMPTS = {
  piatto: `Sei un nutrizionista esperto di cucina italiana e mediterranea. Dalla foto stimi cosa c'è nel piatto e QUANTO ce n'è, per calcolare calorie, zuccheri, proteine e grassi di una persona che segue una dieta ipocalorica e vuole abbassare la glicemia.

Come procedere:
1. Individua i componenti distinti (es. "spaghetti cotti", "sugo di pomodoro", "parmigiano grattugiato"). Aggiungi come voce separata i grassi di condimento plausibili ma poco visibili (es. "olio extravergine di condimento"), con confidence "bassa".
2. Stima i grammi di ogni componente (peso da cotto, come servito) usando i riferimenti visivi: piatto piano 26-28 cm, piatto fondo 22-24 cm, piattino da dessert 19-21 cm, forchetta 19-20 cm, cucchiaio da tavola 15 ml, bicchiere 200 ml, mano adulta. Considera spessore e altezza del cibo, non solo la superficie, e la densità dell'alimento.
3. Se l'utente fornisce indicazioni (peso, ingredienti, cottura, porzione), hanno la precedenza sulla tua stima visiva.
4. In notes scrivi in 1-2 frasi cosa è incerto e cosa renderebbe la stima più precisa.

${COMMON}`,
  etichetta: `Sei un assistente che legge le tabelle nutrizionali delle confezioni alimentari.

Come procedere:
1. Leggi la tabella nutrizionale nella foto e riporta i valori PER 100 g (o 100 ml). Se la tabella riporta solo valori per porzione, convertili a 100 g usando il peso della porzione.
2. Restituisci un solo elemento in items. name = nome del prodotto se leggibile (con la marca), altrimenti una descrizione breve.
3. grams = porzione indicata in etichetta se presente, altrimenti 100.
4. Se un valore non è leggibile, stimalo dal tipo di prodotto e metti confidence "media" o "bassa", spiegando in notes quale valore hai stimato.
5. dish_name = nome del prodotto.

${COMMON}`,
};

const num = (v, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

/** Pulisce e converte l'output del modello nel formato usato dall'app. */
export function normalizeAnalysis(parsed) {
  const items = (parsed?.items ?? [])
    .map((i) => ({
      name: String(i.name ?? '').trim() || 'Alimento',
      grams: Math.round(num(i.grams, 0, 3000)),
      per100: {
        kcal: num(i.per_100g?.kcal, 0, 900),
        carbs: num(i.per_100g?.carbs_g, 0, 100),
        sugars: num(i.per_100g?.sugars_g, 0, 100),
        fiber: num(i.per_100g?.fiber_g, 0, 100),
        protein: num(i.per_100g?.protein_g, 0, 100),
        fat: num(i.per_100g?.fat_g, 0, 100),
      },
      gi: Math.round(num(i.glycemic_index, 0, 110)),
      confidence: ['alta', 'media', 'bassa'].includes(i.confidence) ? i.confidence : 'media',
    }))
    .filter((i) => i.grams > 0);
  for (const i of items) i.per100.sugars = Math.min(i.per100.sugars, i.per100.carbs);
  return {
    isFood: Boolean(parsed?.is_food) && items.length > 0,
    dishName: String(parsed?.dish_name ?? '').trim(),
    items,
    notes: String(parsed?.notes ?? '').trim(),
  };
}

export class AnalysisError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export function createAnalyzer({
  client = new Anthropic(),
  model = process.env.CLAUDE_MODEL || 'claude-opus-5',
  effort = process.env.CLAUDE_EFFORT || 'medium',
} = {}) {
  return async function analyze({ image, mediaType = 'image/jpeg', mode = 'piatto', hint = '' }) {
    const system = PROMPTS[mode] ?? PROMPTS.piatto;
    const request = hint.trim()
      ? `Indicazioni dell'utente: ${hint.trim().slice(0, 500)}`
      : mode === 'etichetta'
        ? 'Leggi questa etichetta.'
        : 'Analizza questo piatto.';
    let response;
    try {
      response = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        // Se il modello declina la richiesta, l'API la ripete su un modello di riserva.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort, format: betaZodOutputFormat(AnalysisSchema) },
        system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
              { type: 'text', text: request },
            ],
          },
        ],
      });
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        throw new AnalysisError('Chiave API non valida sul server (ANTHROPIC_API_KEY).', 500);
      } else if (err instanceof Anthropic.RateLimitError) {
        throw new AnalysisError('Troppe richieste: riprova tra poco.', 429);
      } else if (err instanceof Anthropic.BadRequestError) {
        throw new AnalysisError(`Richiesta non valida: ${err.message}`, 400);
      } else if (err instanceof Anthropic.APIError) {
        throw new AnalysisError(`Servizio di analisi non disponibile (${err.status ?? 'rete'}).`, 502);
      }
      throw err;
    }
    if (response.stop_reason === 'refusal') {
      throw new AnalysisError('Il modello non ha potuto analizzare questa immagine.', 422);
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
      throw new AnalysisError('Analisi incompleta, riprova.', 502);
    }
    return normalizeAnalysis(response.parsed_output);
  };
}

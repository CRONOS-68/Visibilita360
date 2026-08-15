import Anthropic from '@anthropic-ai/sdk';
import { AnalysisRequest, AnalysisResponse } from '../types/market';

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.model = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
    this.client = new Anthropic();
  }

  async analyzeMarketPositioning(request: AnalysisRequest): Promise<AnalysisResponse> {
    const prompt = this.buildMarketPositioningPrompt(request);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        system:
          'Tu sei un esperto di strategia di mercato e posizionamento competitivo. Fornisci analisi dettagliate, dati-driven e actionable per le aziende che vogliono capire la loro posizione di mercato.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const analysisText = this.extractText(response);

      return {
        analysis: analysisText,
        recommendations: this.extractRecommendations(analysisText),
        confidence_score: 0.85,
        data_gaps: this.identifyDataGaps(request),
      };
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error(`Failed to analyze market positioning: ${error}`);
    }
  }

  async analyzePricingStrategy(
    company_profile: string,
    competitor_pricing: string[],
    market_context: string
  ): Promise<AnalysisResponse> {
    const prompt = `
Analizza la strategia di pricing per l'azienda seguente nel contesto del mercato.

PROFILO AZIENDA:
${company_profile}

PREZZI COMPETITOR:
${competitor_pricing.join('\n')}

CONTESTO DI MERCATO:
${market_context}

Fornisci:
1. Raccomandazione di prezzo ottimale
2. Modello di pricing consigliato (subscription, one-time, freemium)
3. Punti di prezzo specifici per ogni tier
4. Strategie di differenziazione tramite prezzo
5. Rischi e opportunità della strategia proposta
`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        system:
          'Sei un esperto di pricing strategy e analisi economica. Fornisci recomendazioni specifiche con dati concreti.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const analysisText = this.extractText(response);

      return {
        analysis: analysisText,
        recommendations: this.extractRecommendations(analysisText),
        confidence_score: 0.80,
        data_gaps: [],
      };
    } catch (error) {
      console.error('Claude API Error (Pricing):', error);
      throw new Error(`Failed to analyze pricing strategy: ${error}`);
    }
  }

  async identifyMarketOpportunities(
    company_industry: string,
    current_position: string,
    market_trends: string[]
  ): Promise<AnalysisResponse> {
    const prompt = `
Identifica opportunità di mercato per un'azienda nel settore ${company_industry}.

POSIZIONE ATTUALE DELL'AZIENDA:
${current_position}

TREND DI MERCATO ATTUALI:
${market_trends.join('\n')}

Analizza e fornisci:
1. Principali gap di mercato non sfruttati
2. Segmenti di clientela non ancora serviti
3. Nuovi modelli di business emergenti
4. Opportunità di espansione geografica
5. Opportunità di cross-selling/upselling
6. Timeline realistica per ogni opportunità
`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 3500,
        system:
          'Sei un esperto di strategia di mercato e identificazione di opportunità. Fornisci insights actionable basati su dati di mercato.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const analysisText = this.extractText(response);

      return {
        analysis: analysisText,
        recommendations: this.extractRecommendations(analysisText),
        confidence_score: 0.75,
        data_gaps: [],
      };
    } catch (error) {
      console.error('Claude API Error (Opportunities):', error);
      throw new Error(`Failed to identify market opportunities: ${error}`);
    }
  }

  private buildMarketPositioningPrompt(request: AnalysisRequest): string {
    return `
Analizza il posizionamento di mercato dell'azienda seguente.

PROFILO AZIENDALE:
${request.company_profile}

DATI COMPETITOR:
${request.competitors_data}

CONTESTO DI MERCATO:
${request.market_context}

Fornisci un'analisi completa che includa:
1. Posizionamento attuale dell'azienda nel mercato
2. Principali vantaggi competitivi
3. Debolezze identificate
4. Minacce dalle azioni competitor
5. Opportunità di differenziazione
6. Strategie di posizionamento consigliate
7. Metriche chiave da monitorare
8. Piano d'azione con priorità
`;
  }

  private extractText(response: Anthropic.Message): string {
    const block = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    );
    return block?.text ?? '';
  }

  private extractRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const lines = text.split('\n');

    let inRecommendations = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('raccomand') || line.toLowerCase().includes('consiglio')) {
        inRecommendations = true;
      }
      if (inRecommendations && (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))) {
        const cleaned = line.replace(/^[-•\d.]\s*/, '').trim();
        if (cleaned.length > 10) {
          recommendations.push(cleaned);
        }
      }
    }

    return recommendations.length > 0
      ? recommendations
      : [
          'Condurre ricerca di mercato primaria',
          'Analizzare più approfonditamente i competitor',
          'Definire segmenti di clientela specifici',
        ];
  }

  private identifyDataGaps(request: AnalysisRequest): string[] {
    const gaps: string[] = [];

    if (!request.company_profile || request.company_profile.length < 50) {
      gaps.push('Profilo aziendale incompleto');
    }

    if (!request.competitors_data || request.competitors_data.length < 50) {
      gaps.push('Dati competitor insufficienti');
    }

    if (request.competitors_data && !request.competitors_data.includes('prezzo')) {
      gaps.push('Informazioni di pricing mancanti');
    }

    if (!request.market_context || request.market_context.length < 30) {
      gaps.push('Contesto di mercato poco dettagliato');
    }

    if (gaps.length === 0) {
      gaps.push('Dati primari di customer feedback');
      gaps.push('Analisi storica delle performance competitor');
    }

    return gaps;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Rispondi con "OK"',
          },
        ],
      });

      return response.content.length > 0;
    } catch (error) {
      console.error('Claude Connection Test Failed:', error);
      return false;
    }
  }
}

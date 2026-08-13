import { Database } from '../database/db';
import { Company, Competitor, PricePoint, MarketAnalysis } from '../types/market';
import { v4 as uuidv4 } from 'uuid';

export class MarketDataService {
  constructor(private db: Database) {}

  async registerCompany(
    name: string,
    industry: string,
    description: string,
    target_market: string,
    website?: string,
    employees_count?: number,
    founded_year?: number
  ): Promise<Company> {
    const company_id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO companies
      (id, name, industry, description, target_market, website, employees_count, founded_year, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const company = await this.db.query<Company>(query, [
      company_id,
      name,
      industry,
      description,
      target_market,
      website || null,
      employees_count || null,
      founded_year || null,
      now,
      now,
    ]);

    return company[0];
  }

  async addCompetitor(
    company_id: string,
    competitor_name: string,
    competitor_industry: string,
    main_products: string[],
    market_position: 'leader' | 'challenger' | 'follower' | 'niche' = 'follower',
    threat_level: 'high' | 'medium' | 'low' = 'medium',
    website?: string
  ): Promise<Competitor> {
    const competitor_id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO competitors
      (id, company_id, competitor_name, competitor_website, competitor_industry, main_products, market_position, threat_level, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const competitor = await this.db.query<Competitor>(query, [
      competitor_id,
      company_id,
      competitor_name,
      website || null,
      competitor_industry,
      JSON.stringify(main_products),
      market_position,
      threat_level,
      now,
      now,
    ]);

    return competitor[0];
  }

  async addPricePoint(
    competitor_id: string,
    product_name: string,
    price: number,
    currency: string = 'EUR',
    pricing_model: 'subscription' | 'one-time' | 'freemium' | 'enterprise' = 'subscription',
    features_included: string[] = []
  ): Promise<PricePoint> {
    const price_id = uuidv4();

    const query = `
      INSERT INTO price_points
      (id, competitor_id, product_name, price, currency, pricing_model, features_included, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const pricePoint = await this.db.query<PricePoint>(query, [
      price_id,
      competitor_id,
      product_name,
      price,
      currency,
      pricing_model,
      JSON.stringify(features_included),
      new Date(),
    ]);

    return pricePoint[0];
  }

  async getCompanyProfile(company_id: string): Promise<Company | null> {
    const query = 'SELECT * FROM companies WHERE id = $1';
    const result = await this.db.query<Company>(query, [company_id]);
    return result.length > 0 ? result[0] : null;
  }

  async getCompetitorsForCompany(company_id: string): Promise<Competitor[]> {
    const query = `
      SELECT * FROM competitors WHERE company_id = $1 ORDER BY threat_level DESC, created_at DESC
    `;
    return this.db.query<Competitor>(query, [company_id]);
  }

  async getCompetitorPricing(competitor_id: string): Promise<PricePoint[]> {
    const query = `
      SELECT * FROM price_points WHERE competitor_id = $1 ORDER BY product_name, price
    `;
    return this.db.query<PricePoint>(query, [competitor_id]);
  }

  async getAllPricingForCompetitors(company_id: string): Promise<PricePoint[]> {
    const query = `
      SELECT pp.* FROM price_points pp
      JOIN competitors c ON pp.competitor_id = c.id
      WHERE c.company_id = $1
      ORDER BY c.competitor_name, pp.product_name
    `;
    return this.db.query<PricePoint>(query, [company_id]);
  }

  async saveMarketAnalysis(
    company_id: string,
    market_size_estimation: string | null,
    growth_rate: number | null,
    key_trends: string[],
    market_opportunities: string[],
    market_threats: string[],
    target_segments: string[],
    saturation_level: 'low' | 'medium' | 'high'
  ): Promise<MarketAnalysis> {
    const analysis_id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO market_analysis
      (id, company_id, analysis_date, market_size_estimation, growth_rate, key_trends, market_opportunities, market_threats, target_segments, saturation_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const analysis = await this.db.query<MarketAnalysis>(query, [
      analysis_id,
      company_id,
      now,
      market_size_estimation,
      growth_rate,
      JSON.stringify(key_trends),
      JSON.stringify(market_opportunities),
      JSON.stringify(market_threats),
      JSON.stringify(target_segments),
      saturation_level,
    ]);

    return analysis[0];
  }

  async getLatestMarketAnalysis(company_id: string): Promise<MarketAnalysis | null> {
    const query = `
      SELECT * FROM market_analysis
      WHERE company_id = $1
      ORDER BY analysis_date DESC
      LIMIT 1
    `;
    const result = await this.db.query<MarketAnalysis>(query, [company_id]);
    return result.length > 0 ? result[0] : null;
  }

  buildCompanyProfileSummary(company: Company): string {
    return `
Nome Azienda: ${company.name}
Settore: ${company.industry}
Descrizione: ${company.description}
Mercato Target: ${company.target_market}
Sito Web: ${company.website || 'N/A'}
Dipendenti: ${company.employees_count || 'N/A'}
Fondazione: ${company.founded_year || 'N/A'}
    `.trim();
  }

  buildCompetitorsSummary(competitors: Competitor[], pricing: PricePoint[]): string {
    let summary = 'COMPETITOR ANALYSIS:\n\n';

    for (const competitor of competitors) {
      summary += `Competitor: ${competitor.competitor_name}\n`;
      summary += `  Settore: ${competitor.competitor_industry}\n`;
      summary += `  Posizione di Mercato: ${competitor.market_position}\n`;
      summary += `  Livello di Minaccia: ${competitor.threat_level}\n`;
      summary += `  Prodotti Principali: ${competitor.main_products?.join(', ') || 'N/A'}\n`;

      const competitorPrices = pricing.filter((p) => p.competitor_id === competitor.id);
      if (competitorPrices.length > 0) {
        summary += `  Prezzi:\n`;
        competitorPrices.forEach((p) => {
          summary += `    - ${p.product_name}: ${p.price} ${p.currency} (${p.pricing_model})\n`;
        });
      }
      summary += '\n';
    }

    return summary;
  }

  buildMarketContextSummary(analysis: MarketAnalysis | null): string {
    if (!analysis) {
      return 'Analisi di mercato non ancora disponibile. Necessari dati su: dimensione mercato, trend, opportunità, minacce.';
    }

    let summary = 'MARKET CONTEXT:\n\n';
    summary += `Data Analisi: ${analysis.analysis_date.toLocaleDateString('it-IT')}\n`;

    if (analysis.market_size_estimation) {
      summary += `Dimensione Mercato: ${analysis.market_size_estimation}\n`;
    }

    if (analysis.growth_rate) {
      summary += `Tasso di Crescita: ${analysis.growth_rate}% annuale\n`;
    }

    if (analysis.key_trends && Array.isArray(analysis.key_trends)) {
      summary += `\nTrend Chiave:\n`;
      analysis.key_trends.forEach((t) => (summary += `- ${t}\n`));
    }

    if (analysis.market_opportunities && Array.isArray(analysis.market_opportunities)) {
      summary += `\nOpportunità di Mercato:\n`;
      analysis.market_opportunities.forEach((o) => (summary += `- ${o}\n`));
    }

    if (analysis.market_threats && Array.isArray(analysis.market_threats)) {
      summary += `\nMinacce di Mercato:\n`;
      analysis.market_threats.forEach((t) => (summary += `- ${t}\n`));
    }

    summary += `\nLivello di Saturazione: ${analysis.saturation_level}\n`;

    return summary;
  }
}

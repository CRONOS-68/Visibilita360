import { Database } from '../database/db';
import { ClaudeClient } from './claude-client';
import { MarketDataService } from './market-data';
import { PositioningReport, Action, Company, Competitor, MarketAnalysis } from '../types/market';
import { v4 as uuidv4 } from 'uuid';

export class PositioningGenerator {
  constructor(
    private db: Database,
    private claudeClient: ClaudeClient,
    private marketData: MarketDataService
  ) {}

  async generatePositioningReport(company_id: string): Promise<PositioningReport> {
    const company = await this.marketData.getCompanyProfile(company_id);
    if (!company) {
      throw new Error(`Company not found: ${company_id}`);
    }

    const competitors = await this.marketData.getCompetitorsForCompany(company_id);
    const pricing = await this.marketData.getAllPricingForCompetitors(company_id);
    const marketAnalysis = await this.marketData.getLatestMarketAnalysis(company_id);

    const companyProfileSummary = this.marketData.buildCompanyProfileSummary(company);
    const competitorsSummary = this.marketData.buildCompetitorsSummary(competitors, pricing);
    const marketContextSummary = this.marketData.buildMarketContextSummary(marketAnalysis);

    const analysis = await this.claudeClient.analyzeMarketPositioning({
      company_profile: companyProfileSummary,
      competitors_data: competitorsSummary,
      market_context: marketContextSummary,
      analysis_type: 'positioning',
    });

    const report = await this.savePositioningReport(
      company_id,
      analysis.analysis,
      analysis.recommendations
    );

    return report;
  }

  private async savePositioningReport(
    company_id: string,
    analysis: string,
    recommendations: string[]
  ): Promise<PositioningReport> {
    const report_id = uuidv4();
    const now = new Date();

    const { advantages, weaknesses, opportunities, pricing_recommendation, differentiation } =
      this.extractInsights(analysis);

    const query = `
      INSERT INTO positioning_reports
      (id, company_id, generated_at, positioning_strategy, competitive_advantages, weaknesses, market_gap_opportunities, pricing_strategy_recommendation, differentiation_points, ai_insights)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const report = await this.db.query<PositioningReport>(query, [
      report_id,
      company_id,
      now,
      analysis,
      JSON.stringify(advantages),
      JSON.stringify(weaknesses),
      JSON.stringify(opportunities),
      pricing_recommendation,
      JSON.stringify(differentiation),
      JSON.stringify(recommendations),
    ]);

    const savedReport = report[0];

    // Save action items
    const actions = await this.generateActions(report_id, analysis, recommendations);
    savedReport.recommended_actions = actions;

    return savedReport;
  }

  private async generateActions(
    report_id: string,
    analysis: string,
    recommendations: string[]
  ): Promise<Action[]> {
    const actions: Action[] = [];

    for (let i = 0; i < Math.min(recommendations.length, 5); i++) {
      const action_id = uuidv4();
      const recommendation = recommendations[i];

      const priority = i < 2 ? 'high' : i < 4 ? 'medium' : 'low';
      const timeline = i < 2 ? 14 : i < 4 ? 30 : 60;

      const query = `
        INSERT INTO actions
        (id, report_id, priority, action_description, expected_impact, timeline_days)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const action = await this.db.query<Action>(query, [
        action_id,
        report_id,
        priority,
        recommendation,
        `Implementazione di: ${recommendation.substring(0, 50)}...`,
        timeline,
      ]);

      if (action.length > 0) {
        actions.push(action[0]);
      }
    }

    return actions;
  }

  private extractInsights(analysisText: string): {
    advantages: string[];
    weaknesses: string[];
    opportunities: string[];
    pricing_recommendation: string;
    differentiation: string[];
  } {
    const lines = analysisText.split('\n');
    const advantages: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    let differentiation: string[] = [];
    let pricing_recommendation = '';

    let currentSection = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('vantaggi') || lowerLine.includes('advantage')) {
        currentSection = 'advantages';
      } else if (lowerLine.includes('debolezz') || lowerLine.includes('weakness')) {
        currentSection = 'weaknesses';
      } else if (lowerLine.includes('opportunit')) {
        currentSection = 'opportunities';
      } else if (lowerLine.includes('prezzo') || lowerLine.includes('pricing')) {
        currentSection = 'pricing';
      } else if (lowerLine.includes('differenziazione') || lowerLine.includes('differentiation')) {
        currentSection = 'differentiation';
      } else if ((line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)) && currentSection) {
        const cleaned = line.replace(/^[-•\d.]\s*/, '').trim();
        if (cleaned.length > 10) {
          switch (currentSection) {
            case 'advantages':
              advantages.push(cleaned);
              break;
            case 'weaknesses':
              weaknesses.push(cleaned);
              break;
            case 'opportunities':
              opportunities.push(cleaned);
              break;
            case 'differentiation':
              differentiation.push(cleaned);
              break;
          }
        }
      } else if (currentSection === 'pricing' && line.length > 20) {
        pricing_recommendation = line.trim();
      }
    }

    return {
      advantages: advantages.length > 0 ? advantages : ['Posizionamento di mercato definito'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Competizione intensa'],
      opportunities: opportunities.length > 0 ? opportunities : ['Espansione di segmenti'],
      pricing_recommendation:
        pricing_recommendation || 'Strategie di pricing competitivo da valutare',
      differentiation:
        differentiation.length > 0
          ? differentiation
          : ['Sviluppare unique value proposition'],
    };
  }

  async generatePricingStrategy(company_id: string): Promise<{
    strategy: string;
    recommendations: string[];
    pricing_tiers: Array<{ tier: string; price: number; features: string[] }>;
  }> {
    const company = await this.marketData.getCompanyProfile(company_id);
    if (!company) {
      throw new Error(`Company not found: ${company_id}`);
    }

    const competitors = await this.marketData.getCompetitorsForCompany(company_id);
    const pricing = await this.marketData.getAllPricingForCompetitors(company_id);

    const companyProfileSummary = this.marketData.buildCompanyProfileSummary(company);
    const marketContextSummary = this.marketData.buildMarketContextSummary(
      await this.marketData.getLatestMarketAnalysis(company_id)
    );

    const competitorPricingList = pricing.map(
      (p) => `${p.product_name}: ${p.price}${p.currency} (${p.pricing_model})`
    );

    const analysis = await this.claudeClient.analyzePricingStrategy(
      companyProfileSummary,
      competitorPricingList,
      marketContextSummary
    );

    const tiers = this.extractPricingTiers(analysis.analysis);

    return {
      strategy: analysis.analysis,
      recommendations: analysis.recommendations,
      pricing_tiers: tiers,
    };
  }

  async identifyMarketOpportunities(company_id: string): Promise<{
    opportunities: string[];
    gaps: string[];
    recommended_actions: string[];
  }> {
    const company = await this.marketData.getCompanyProfile(company_id);
    if (!company) {
      throw new Error(`Company not found: ${company_id}`);
    }

    const marketAnalysis = await this.marketData.getLatestMarketAnalysis(company_id);
    const companyProfileSummary = this.marketData.buildCompanyProfileSummary(company);

    const trends = marketAnalysis?.key_trends || ['Trend in definizione', 'Mercato in evoluzione'];

    const analysis = await this.claudeClient.identifyMarketOpportunities(
      company.industry,
      companyProfileSummary,
      trends
    );

    return {
      opportunities: analysis.recommendations.slice(0, 3),
      gaps: analysis.data_gaps,
      recommended_actions: analysis.recommendations.slice(3),
    };
  }

  private extractPricingTiers(analysisText: string): Array<{
    tier: string;
    price: number;
    features: string[];
  }> {
    const tiers = [
      {
        tier: 'Basic',
        price: 49,
        features: ['Funzionalità base', 'Supporto email', 'Dashboard principale'],
      },
      {
        tier: 'Professional',
        price: 99,
        features: ['Tutte le funzionalità Basic', 'Supporto prioritario', 'API access'],
      },
      {
        tier: 'Enterprise',
        price: 299,
        features: [
          'Tutte le funzionalità Professional',
          'Supporto 24/7',
          'Custom integrations',
          'Dedicato account manager',
        ],
      },
    ];

    // Extract price hints from analysis if present
    const priceMatches = analysisText.match(/€?\d{1,4}(?:\.\d{2})?/g);
    if (priceMatches && priceMatches.length >= 2) {
      tiers[0].price = parseInt(priceMatches[0]) || 49;
      tiers[1].price = parseInt(priceMatches[1]) || 99;
      if (priceMatches[2]) {
        tiers[2].price = parseInt(priceMatches[2]) || 299;
      }
    }

    return tiers;
  }
}

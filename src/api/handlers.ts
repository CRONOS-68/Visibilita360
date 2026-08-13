import { Request, Response } from 'express';
import { Database } from '../database/db';
import { MarketDataService } from '../services/market-data';
import { PositioningGenerator } from '../services/positioning-generator';
import { KimiClient } from '../services/kimi-client';

export class MarketPositioningHandlers {
  private db: Database;
  private marketData: MarketDataService;
  private positioningGenerator: PositioningGenerator;
  private kimi: KimiClient;

  constructor() {
    this.db = new Database();
    this.kimi = new KimiClient();
    this.marketData = new MarketDataService(this.db);
    this.positioningGenerator = new PositioningGenerator(
      this.db,
      this.kimi,
      this.marketData
    );
  }

  // Registra una nuova azienda
  async registerCompany(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        industry,
        description,
        target_market,
        website,
        employees_count,
        founded_year,
      } = req.body;

      if (!name || !industry || !description || !target_market) {
        res.status(400).json({
          error: 'Missing required fields: name, industry, description, target_market',
        });
        return;
      }

      const company = await this.marketData.registerCompany(
        name,
        industry,
        description,
        target_market,
        website,
        employees_count,
        founded_year
      );

      res.status(201).json({
        success: true,
        company_id: company.id,
        company,
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to register company: ${error}`,
      });
    }
  }

  // Aggiunge un competitor
  async addCompetitor(req: Request, res: Response): Promise<void> {
    try {
      const {
        company_id,
        competitor_name,
        competitor_industry,
        main_products,
        market_position,
        threat_level,
        website,
      } = req.body;

      if (!company_id || !competitor_name || !competitor_industry) {
        res.status(400).json({
          error: 'Missing required fields: company_id, competitor_name, competitor_industry',
        });
        return;
      }

      const competitor = await this.marketData.addCompetitor(
        company_id,
        competitor_name,
        competitor_industry,
        main_products || [],
        market_position || 'follower',
        threat_level || 'medium',
        website
      );

      res.status(201).json({
        success: true,
        competitor_id: competitor.id,
        competitor,
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to add competitor: ${error}`,
      });
    }
  }

  // Aggiunge un prezzo a un competitor
  async addPricePoint(req: Request, res: Response): Promise<void> {
    try {
      const {
        competitor_id,
        product_name,
        price,
        currency,
        pricing_model,
        features_included,
      } = req.body;

      if (!competitor_id || !product_name || !price) {
        res.status(400).json({
          error: 'Missing required fields: competitor_id, product_name, price',
        });
        return;
      }

      const pricePoint = await this.marketData.addPricePoint(
        competitor_id,
        product_name,
        parseFloat(price),
        currency || 'EUR',
        pricing_model || 'subscription',
        features_included || []
      );

      res.status(201).json({
        success: true,
        price_point_id: pricePoint.id,
        pricePoint,
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to add price point: ${error}`,
      });
    }
  }

  // Ottiene il profilo di un'azienda
  async getCompanyProfile(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;

      const company = await this.marketData.getCompanyProfile(company_id);
      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      const competitors = await this.marketData.getCompetitorsForCompany(company_id);
      const pricing = await this.marketData.getAllPricingForCompetitors(company_id);
      const analysis = await this.marketData.getLatestMarketAnalysis(company_id);

      res.json({
        company,
        competitors_count: competitors.length,
        total_pricing_points: pricing.length,
        last_analysis_date: analysis?.analysis_date || null,
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to retrieve company profile: ${error}`,
      });
    }
  }

  // Genera un report di posizionamento
  async generatePositioningReport(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;

      res.json({
        status: 'generating',
        message: 'Report generation started. This may take a minute...',
      });

      // Async generation
      setImmediate(async () => {
        try {
          const report = await this.positioningGenerator.generatePositioningReport(company_id);
          console.log(`Positioning report generated for company ${company_id}`);
        } catch (error) {
          console.error(`Failed to generate positioning report: ${error}`);
        }
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to start report generation: ${error}`,
      });
    }
  }

  // Genera una strategia di prezzo
  async generatePricingStrategy(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;

      const strategy = await this.positioningGenerator.generatePricingStrategy(company_id);

      res.json({
        success: true,
        strategy_summary: strategy.strategy.substring(0, 500) + '...',
        pricing_tiers: strategy.pricing_tiers,
        top_recommendations: strategy.recommendations.slice(0, 3),
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to generate pricing strategy: ${error}`,
      });
    }
  }

  // Identifica opportunità di mercato
  async identifyMarketOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;

      const opportunities = await this.positioningGenerator.identifyMarketOpportunities(
        company_id
      );

      res.json({
        success: true,
        opportunities: opportunities.opportunities,
        market_gaps: opportunities.gaps,
        recommended_actions: opportunities.recommended_actions,
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to identify market opportunities: ${error}`,
      });
    }
  }

  // Health check
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const dbHealthy = await this.db.testConnection();
      const kimiHealthy = await this.kimi.testConnection();

      res.json({
        status: dbHealthy && kimiHealthy ? 'healthy' : 'degraded',
        database: dbHealthy ? 'connected' : 'disconnected',
        kimi_api: kimiHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: `Health check failed: ${error}`,
      });
    }
  }
}

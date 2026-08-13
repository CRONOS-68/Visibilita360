import { Router, Request, Response } from 'express';
import { MarketPositioningHandlers } from './handlers';

export function createRoutes(): Router {
  const router = Router();
  const handlers = new MarketPositioningHandlers();

  // Health check
  router.get('/health', (req: Request, res: Response) =>
    handlers.healthCheck(req, res)
  );

  // Company management
  router.post('/companies', (req: Request, res: Response) =>
    handlers.registerCompany(req, res)
  );

  router.get('/companies/:company_id', (req: Request, res: Response) =>
    handlers.getCompanyProfile(req, res)
  );

  // Competitor management
  router.post('/companies/:company_id/competitors', (req: Request, res: Response) => {
    req.body.company_id = req.params.company_id;
    handlers.addCompetitor(req, res);
  });

  // Pricing management
  router.post('/competitors/:competitor_id/pricing', (req: Request, res: Response) => {
    req.body.competitor_id = req.params.competitor_id;
    handlers.addPricePoint(req, res);
  });

  // Analysis and reports
  router.post('/companies/:company_id/positioning-report', (req: Request, res: Response) =>
    handlers.generatePositioningReport(req, res)
  );

  router.post('/companies/:company_id/pricing-strategy', (req: Request, res: Response) =>
    handlers.generatePricingStrategy(req, res)
  );

  router.post('/companies/:company_id/market-opportunities', (req: Request, res: Response) =>
    handlers.identifyMarketOpportunities(req, res)
  );

  return router;
}

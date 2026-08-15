import express from 'express';
import dotenv from 'dotenv';
import { createRoutes } from './api/routes';
import { Database } from './database/db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const db = new Database();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
const apiRoutes = createRoutes();
app.use('/api/v1', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Visibilita360 - Market Positioning API',
    version: '0.1.0',
    description: 'Market Positioning & Competitor Analysis using Claude Sonnet 5',
    endpoints: {
      health: '/api/v1/health',
      register_company: 'POST /api/v1/companies',
      get_company: 'GET /api/v1/companies/{company_id}',
      add_competitor: 'POST /api/v1/companies/{company_id}/competitors',
      add_pricing: 'POST /api/v1/competitors/{competitor_id}/pricing',
      generate_report: 'POST /api/v1/companies/{company_id}/positioning-report',
      pricing_strategy: 'POST /api/v1/companies/{company_id}/pricing-strategy',
      market_opportunities: 'POST /api/v1/companies/{company_id}/market-opportunities',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await db.initialize();
    console.log('Database initialized successfully');

    app.listen(port, () => {
      console.log(`Market Positioning API listening on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Claude Model: ${process.env.CLAUDE_MODEL || 'claude-sonnet-5'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

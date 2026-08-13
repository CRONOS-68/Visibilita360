-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  target_market VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  employees_count INTEGER,
  founded_year INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  competitor_name VARCHAR(255) NOT NULL,
  competitor_website VARCHAR(255),
  competitor_industry VARCHAR(100) NOT NULL,
  main_products JSONB,
  market_position VARCHAR(50) NOT NULL DEFAULT 'follower',
  threat_level VARCHAR(50) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(company_id, competitor_name)
);

-- Price points table
CREATE TABLE IF NOT EXISTS price_points (
  id UUID PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  pricing_model VARCHAR(50) DEFAULT 'subscription',
  features_included JSONB,
  last_updated TIMESTAMP NOT NULL
);

-- Market analysis table
CREATE TABLE IF NOT EXISTS market_analysis (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analysis_date TIMESTAMP NOT NULL,
  market_size_estimation TEXT,
  growth_rate DECIMAL(5, 2),
  key_trends JSONB,
  market_opportunities JSONB,
  market_threats JSONB,
  target_segments JSONB,
  saturation_level VARCHAR(50) DEFAULT 'medium',
  UNIQUE(company_id, analysis_date)
);

-- Positioning reports table
CREATE TABLE IF NOT EXISTS positioning_reports (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  generated_at TIMESTAMP NOT NULL,
  positioning_strategy TEXT NOT NULL,
  competitive_advantages JSONB,
  weaknesses JSONB,
  market_gap_opportunities JSONB,
  pricing_strategy_recommendation TEXT,
  target_market_focus JSONB,
  differentiation_points JSONB,
  ai_insights JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actions table (recommendations from reports)
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES positioning_reports(id) ON DELETE CASCADE,
  priority VARCHAR(50) NOT NULL,
  action_description TEXT NOT NULL,
  expected_impact TEXT,
  timeline_days INTEGER,
  responsibility VARCHAR(255),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_competitors_company_id ON competitors(company_id);
CREATE INDEX IF NOT EXISTS idx_price_points_competitor_id ON price_points(competitor_id);
CREATE INDEX IF NOT EXISTS idx_market_analysis_company_id ON market_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_positioning_reports_company_id ON positioning_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_actions_report_id ON actions(report_id);

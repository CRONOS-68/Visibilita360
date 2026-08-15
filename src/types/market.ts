export interface Company {
  id: string;
  name: string;
  industry: string;
  website?: string;
  description: string;
  target_market: string;
  employees_count?: number;
  founded_year?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Competitor {
  id: string;
  company_id: string;
  competitor_name: string;
  competitor_website?: string;
  competitor_industry: string;
  main_products: string[];
  market_position: 'leader' | 'challenger' | 'follower' | 'niche';
  threat_level: 'high' | 'medium' | 'low';
  created_at: Date;
  updated_at: Date;
}

export interface PricePoint {
  id: string;
  competitor_id: string;
  product_name: string;
  price: number;
  currency: string;
  pricing_model: 'subscription' | 'one-time' | 'freemium' | 'enterprise';
  features_included: string[];
  last_updated: Date;
}

export interface MarketAnalysis {
  id: string;
  company_id: string;
  analysis_date: Date;
  market_size_estimation?: string;
  growth_rate?: number;
  key_trends: string[];
  market_opportunities: string[];
  market_threats: string[];
  target_segments: string[];
  saturation_level: 'low' | 'medium' | 'high';
}

export interface PositioningReport {
  id: string;
  company_id: string;
  generated_at: Date;
  positioning_strategy: string;
  competitive_advantages: string[];
  weaknesses: string[];
  market_gap_opportunities: string[];
  pricing_strategy_recommendation: string;
  target_market_focus: string[];
  differentiation_points: string[];
  recommended_actions: Action[];
  ai_insights: string;
}

export interface Action {
  id: string;
  report_id: string;
  priority: 'high' | 'medium' | 'low';
  action_description: string;
  expected_impact: string;
  timeline_days: number;
  responsibility?: string;
}

export interface AnalysisRequest {
  company_profile: string;
  competitors_data: string;
  market_context: string;
  analysis_type: 'positioning' | 'pricing_strategy' | 'market_opportunity' | 'competitive_analysis';
}

export interface AnalysisResponse {
  analysis: string;
  recommendations: string[];
  confidence_score: number;
  data_gaps: string[];
}

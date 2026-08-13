import axios from 'axios'

const API_BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Company {
  id: string
  name: string
  industry: string
  description: string
  target_market: string
  website?: string
  employees_count?: number
  founded_year?: number
}

export interface Competitor {
  id: string
  competitor_name: string
  competitor_industry: string
  main_products: string[]
  market_position: 'leader' | 'challenger' | 'follower' | 'niche'
  threat_level: 'high' | 'medium' | 'low'
}

export interface PositioningReport {
  positioning_strategy: string
  competitive_advantages: string[]
  weaknesses: string[]
  market_gap_opportunities: string[]
  pricing_strategy_recommendation: string
  differentiation_points: string[]
}

export const apiService = {
  registerCompany: async (data: Partial<Company>) => {
    const response = await api.post('/companies', data)
    return response.data
  },

  getCompanyProfile: async (companyId: string) => {
    const response = await api.get(`/companies/${companyId}`)
    return response.data
  },

  addCompetitor: async (companyId: string, data: Partial<Competitor>) => {
    const response = await api.post(`/companies/${companyId}/competitors`, data)
    return response.data
  },

  addPricing: async (competitorId: string, data: any) => {
    const response = await api.post(`/competitors/${competitorId}/pricing`, data)
    return response.data
  },

  generateReport: async (companyId: string) => {
    const response = await api.post(`/companies/${companyId}/positioning-report`)
    return response.data
  },

  generatePricingStrategy: async (companyId: string) => {
    const response = await api.post(`/companies/${companyId}/pricing-strategy`)
    return response.data
  },

  identifyOpportunities: async (companyId: string) => {
    const response = await api.post(`/companies/${companyId}/market-opportunities`)
    return response.data
  },

  healthCheck: async () => {
    const response = await api.get('/health')
    return response.data
  },
}

export default api

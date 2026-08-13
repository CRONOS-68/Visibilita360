import React, { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Stepper } from './components/Stepper'
import { LoadingSpinner } from './components/LoadingSpinner'
import { Toast } from './components/Toast'
import { apiService, Company, Competitor } from './services/api'
import {
  Plus,
  X,
  Zap,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Flag,
  CheckCircle,
  BarChart3,
} from 'lucide-react'

type Step = 1 | 2 | 3

interface CompanyForm {
  name: string
  industry: string
  description: string
  target_market: string
  website: string
  employees_count: string
  founded_year: string
}

interface CompetitorForm {
  name: string
  industry: string
  products: string
  position: 'leader' | 'challenger' | 'follower' | 'niche'
  threat: 'high' | 'medium' | 'low'
}

interface Report {
  positioning_strategy: string
  competitive_advantages: string[]
  weaknesses: string[]
  market_gap_opportunities: string[]
  pricing_strategy_recommendation: string
  differentiation_points: string[]
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [companyId, setCompanyId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    name: '',
    industry: '',
    description: '',
    target_market: '',
    website: '',
    employees_count: '',
    founded_year: '',
  })

  const [competitors, setCompetitors] = useState<CompetitorForm[]>([])
  const [competitorForm, setCompetitorForm] = useState<CompetitorForm>({
    name: '',
    industry: '',
    products: '',
    position: 'follower',
    threat: 'medium',
  })

  const [report, setReport] = useState<Report | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type })
  }

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyForm.name || !companyForm.industry) {
      showToast('Completa tutti i campi obbligatori', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await apiService.registerCompany({
        name: companyForm.name,
        industry: companyForm.industry,
        description: companyForm.description,
        target_market: companyForm.target_market,
        website: companyForm.website || undefined,
        employees_count: companyForm.employees_count ? parseInt(companyForm.employees_count) : undefined,
        founded_year: companyForm.founded_year ? parseInt(companyForm.founded_year) : undefined,
      })

      setCompanyId(response.company_id)
      setCurrentStep(2)
      showToast('Azienda registrata con successo! 🎉', 'success')
    } catch (error) {
      showToast('Errore nella registrazione dell\'azienda', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault()

    if (!competitorForm.name || !competitorForm.industry) {
      showToast('Completa nome e settore competitor', 'error')
      return
    }

    setCompetitors([...competitors, { ...competitorForm }])
    setCompetitorForm({
      name: '',
      industry: '',
      products: '',
      position: 'follower',
      threat: 'medium',
    })
    showToast(`Competitor "${competitorForm.name}" aggiunto!`, 'success')
  }

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index))
  }

  const handleGenerateReport = async () => {
    if (competitors.length === 0) {
      showToast('Aggiungi almeno un competitor', 'error')
      return
    }

    setLoading(true)
    try {
      await apiService.generateReport(companyId)
      setCurrentStep(3)
      showToast('Report generato con successo! 📊', 'success')

      // Simula il report con dati di esempio
      setReport({
        positioning_strategy:
          'InvoiceAI deve posizionarsi come alternativa moderna e AI-powered ai competitor leader, enfatizzando automazione intelligente della fatturazione e user experience intuitiva per PMI italiane.',
        competitive_advantages: [
          'Tecnologia AI integrata per automazione contabile',
          'UX moderna e intuitiva progettata per PMI',
          'Pricing competitivo vs Fatture in Cloud',
          'Focus specializzato sul mercato italiano',
        ],
        weaknesses: [
          'Brand awareness limitato vs competitor consolidati',
          'Team piccolo vs aziende enterprise',
          'Mancanza di ecosistema completo (e-commerce, magazzino)',
          'Matrice di funzionalità ancora in sviluppo',
        ],
        market_gap_opportunities: [
          'Mercato SMB italiano in crescita (+15% annuale)',
          'Gap nel segmento micro-imprese (<5 dipendenti)',
          'Trend verso automazione AI ancora poco sfruttato',
          'Mancanza di soluzione italiana con AI nativa',
          'Opportunità partnership con consulenti tributari',
        ],
        pricing_strategy_recommendation:
          'Lanciare con 3 tier: Startup €45/mese (fatturazione base + AI), Growth €89/mese (+ integrazioni bancarie), Enterprise €199/mese (+ API + support dedicato).',
        differentiation_points: [
          'AI nativa per categorizzazione automatica',
          'Integrazione bancaria intelligente',
          'Support multi-canale in italiano',
          'Compliance GDPR e normative italiane',
          'Community di PMI italiane',
        ],
      })
    } catch (error) {
      showToast('Errore nella generazione del report', 'error')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Stepper currentStep={currentStep} />

        <div className="mt-8">
          {/* Step 1: Company Registration */}
          {currentStep === 1 && (
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600" />
                Registra la tua Azienda
              </h2>

              <form onSubmit={handleRegisterCompany} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nome Azienda *
                    </label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. TechStartup SRL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Settore *
                    </label>
                    <input
                      type="text"
                      value={companyForm.industry}
                      onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. SaaS / Software"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descrizione *
                    </label>
                    <textarea
                      value={companyForm.description}
                      onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Descrivi brevemente cosa fa la tua azienda..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mercato Target *
                    </label>
                    <input
                      type="text"
                      value={companyForm.target_market}
                      onChange={(e) => setCompanyForm({ ...companyForm, target_market: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. PMI italiane 10-50 dipendenti"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sito Web
                    </label>
                    <input
                      type="url"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Numero Dipendenti
                    </label>
                    <input
                      type="number"
                      value={companyForm.employees_count}
                      onChange={(e) => setCompanyForm({ ...companyForm, employees_count: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. 12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Anno Fondazione
                    </label>
                    <input
                      type="number"
                      value={companyForm.founded_year}
                      onChange={(e) => setCompanyForm({ ...companyForm, founded_year: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="es. 2020"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Registrazione in corso...' : 'Registra Azienda'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Competitor Tracking */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="card p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Aggiungi Competitor
                </h2>

                <form onSubmit={handleAddCompetitor} className="space-y-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome Competitor *
                      </label>
                      <input
                        type="text"
                        value={competitorForm.name}
                        onChange={(e) => setCompetitorForm({ ...competitorForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="es. HubSpot"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Settore *
                      </label>
                      <input
                        type="text"
                        value={competitorForm.industry}
                        onChange={(e) => setCompetitorForm({ ...competitorForm, industry: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="es. SaaS / CRM"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Prodotti Principali
                      </label>
                      <input
                        type="text"
                        value={competitorForm.products}
                        onChange={(e) => setCompetitorForm({ ...competitorForm, products: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="es. CRM, Email Marketing, Automazione"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Posizione di Mercato
                      </label>
                      <select
                        value={competitorForm.position}
                        onChange={(e) =>
                          setCompetitorForm({
                            ...competitorForm,
                            position: e.target.value as typeof competitorForm.position,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="leader">Leader</option>
                        <option value="challenger">Challenger</option>
                        <option value="follower">Follower</option>
                        <option value="niche">Niche</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Livello di Minaccia
                      </label>
                      <select
                        value={competitorForm.threat}
                        onChange={(e) =>
                          setCompetitorForm({
                            ...competitorForm,
                            threat: e.target.value as typeof competitorForm.threat,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Bassa</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Aggiungi Competitor
                  </button>
                </form>

                {/* Competitors List */}
                {competitors.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Competitor Aggiunti ({competitors.length})
                    </h3>
                    <div className="space-y-3">
                      {competitors.map((comp, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{comp.name}</h4>
                            <p className="text-sm text-gray-600">{comp.industry}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span
                                className={`badge ${
                                  comp.threat === 'high'
                                    ? 'badge-danger'
                                    : comp.threat === 'medium'
                                    ? 'badge-warning'
                                    : 'badge-success'
                                }`}
                              >
                                {comp.threat === 'high'
                                  ? '🔴 Minaccia Alta'
                                  : comp.threat === 'medium'
                                  ? '🟡 Minaccia Media'
                                  : '🟢 Minaccia Bassa'}
                              </span>
                              <span className="badge badge-info">{comp.position}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeCompetitor(idx)}
                            className="text-red-500 hover:text-red-700 transition p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {competitors.length > 0 && (
                <button
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      Generando Report...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-6 h-6" />
                      Genera Report di Posizionamento
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 3: Report */}
          {currentStep === 3 && report && (
            <div className="space-y-6">
              {loading && <LoadingSpinner message="Elaborando l'analisi..." />}

              {!loading && (
                <>
                  {/* Positioning Strategy */}
                  <div className="card p-8 border-l-4 border-l-blue-600">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-6 h-6 text-blue-600" />
                      Strategia di Posizionamento
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{report.positioning_strategy}</p>
                  </div>

                  {/* Competitive Advantages */}
                  <div className="card p-8 border-l-4 border-l-green-600">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      Vantaggi Competitivi
                    </h3>
                    <div className="space-y-2">
                      {report.competitive_advantages.map((adv, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="badge badge-success mt-1">✓</span>
                          <p className="text-gray-700">{adv}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weaknesses */}
                  <div className="card p-8 border-l-4 border-l-red-600">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      Debolezze
                    </h3>
                    <div className="space-y-2">
                      {report.weaknesses.map((weak, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="badge badge-danger mt-1">⚠</span>
                          <p className="text-gray-700">{weak}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market Opportunities */}
                  <div className="card p-8 border-l-4 border-l-yellow-600">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Lightbulb className="w-6 h-6 text-yellow-600" />
                      Opportunità di Gap di Mercato
                    </h3>
                    <div className="space-y-2">
                      {report.market_gap_opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="badge badge-warning mt-1">→</span>
                          <p className="text-gray-700">{opp}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Strategy */}
                  <div className="card p-8 border-l-4 border-l-purple-600 bg-gradient-to-r from-purple-50 to-pink-50">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                      Strategia di Pricing Consigliata
                    </h3>
                    <p className="text-gray-700 text-lg font-semibold">
                      {report.pricing_strategy_recommendation}
                    </p>
                  </div>

                  {/* Differentiation Points */}
                  <div className="card p-8 border-l-4 border-l-indigo-600">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Flag className="w-6 h-6 text-indigo-600" />
                      Punti di Differenziazione
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.differentiation_points.map((point, idx) => (
                        <div key={idx} className="bg-indigo-100 border border-indigo-300 rounded-lg p-3">
                          <p className="text-gray-700 font-medium">⭐ {point}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setCurrentStep(1)
                        setCompanyForm({
                          name: '',
                          industry: '',
                          description: '',
                          target_market: '',
                          website: '',
                          employees_count: '',
                          founded_year: '',
                        })
                        setCompetitors([])
                        setReport(null)
                      }}
                      className="btn-secondary flex-1"
                    >
                      Nuova Analisi
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn-primary flex-1"
                    >
                      Stampa / Esporta PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <Footer />
    </div>
  )
}

import React from 'react'
import { TrendingUp, BarChart3 } from 'lucide-react'

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Visibilita360</h1>
              <p className="text-blue-100 text-sm">Market Positioning Analyzer</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">€75</div>
            <div className="text-blue-100 text-sm">/mese</div>
          </div>
        </div>
      </div>
    </header>
  )
}

import React from 'react'
import { Loader } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Analizzando...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16 mb-4">
        <Loader className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
      <p className="text-lg text-gray-600 font-semibold">{message}</p>
      <div className="mt-4 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 animate-pulse-slow" />
      </div>
    </div>
  )
}

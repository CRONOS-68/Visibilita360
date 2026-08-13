import React from 'react'
import { Check, Building2, Users, FileText } from 'lucide-react'

interface StepperProps {
  currentStep: number
}

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Azienda', icon: Building2 },
    { id: 2, label: 'Competitor', icon: Users },
    { id: 3, label: 'Report', icon: FileText },
  ]

  return (
    <div className="py-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <p className={`mt-2 font-semibold ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                  {step.label}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

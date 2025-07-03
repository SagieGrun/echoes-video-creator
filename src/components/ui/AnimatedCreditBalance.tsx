'use client'

import { useCreditBalance } from '@/hooks/useCreditBalance'

interface AnimatedCreditBalanceProps {
  userId: string | null
  className?: string
}

export function AnimatedCreditBalance({ userId, className = "" }: AnimatedCreditBalanceProps) {
  const { credits, showAnimation, creditsAdded, isLoading } = useCreditBalance(userId)
  
  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm ${className}`}>
        <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
      </div>
    )
  }
  
  return (
    <div className={`relative ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className={`text-lg font-semibold text-blue-600 transition-all duration-300 ${
            showAnimation ? 'scale-110' : ''
          }`}>
            {credits}
          </span>
          <span className="text-sm text-gray-600 font-medium">credits</span>
        </div>
      </div>
      
      {showAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-blue-200 rounded-lg opacity-50 animate-pulse"></div>
          
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full animate-bounce`}
                style={{
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'][i],
                  left: `${15 + (i * 8)}%`,
                  top: `${25 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${1.2 + (i % 2) * 0.4}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
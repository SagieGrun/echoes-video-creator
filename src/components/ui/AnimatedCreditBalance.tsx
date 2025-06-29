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
      <div className={`bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 ${className}`}>
        <div className="animate-pulse bg-blue-200 h-8 w-12 rounded"></div>
      </div>
    )
  }
  
  return (
    <div className={`relative ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 transition-all duration-300">
        <span className={`text-2xl font-bold text-blue-600 transition-all duration-300 ${
          showAnimation ? 'scale-110' : ''
        }`}>
          {credits}
        </span>
      </div>
      
      {showAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Glow effect */}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg opacity-20 animate-ping"></div>
          
          {/* Credit increase indicator */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-bold shadow-lg">
              +{creditsAdded} Credits! 🎉
            </div>
          </div>
          
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full animate-bounce`}
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i],
                  left: `${20 + i * 12}%`,
                  top: `${20 + (i % 2) * 20}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
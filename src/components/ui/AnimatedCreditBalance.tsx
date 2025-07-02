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
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl px-6 py-3 shadow-sm ${className}`}>
        <div className="animate-pulse bg-blue-200 h-8 w-16 rounded-lg"></div>
      </div>
    )
  }
  
  return (
    <div className={`relative ${className}`}>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl px-6 py-3 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className={`text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transition-all duration-300 ${
            showAnimation ? 'scale-110' : ''
          }`}>
            {credits}
          </span>
          <span className="text-sm text-gray-600 font-medium">credits</span>
        </div>
      </div>
      
      {showAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Enhanced glow effect */}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 rounded-xl opacity-30 animate-ping"></div>
          
          {/* Enhanced confetti particles - more particles, better distribution */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full animate-bounce shadow-lg`}
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#A8E6CF', '#FFB6C1', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3'][i],
                  left: `${10 + (i * 7)}%`,
                  top: `${20 + (i % 4) * 20}%`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: `${1.0 + (i % 3) * 0.3}s`,
                  transform: `rotate(${i * 30}deg)`
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
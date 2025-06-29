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
          
          {/* Credit increase indicator */}
          <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 animate-bounce z-50">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-green-400">
              +{creditsAdded} Credits! 🎉
            </div>
          </div>
          
          {/* Enhanced confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-3 h-3 rounded-full animate-bounce shadow-sm`}
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#A8E6CF', '#FFB6C1'][i],
                  left: `${15 + i * 10}%`,
                  top: `${15 + (i % 3) * 15}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1.2s'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
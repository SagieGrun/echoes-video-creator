'use client'

import { useSmartLogin } from '@/hooks/useSmartLogin'

export function CTASection() {
  const { handleSmartLogin, isLoading } = useSmartLogin()

  return (
    <section className="py-20 px-4 bg-gradient-to-r from-accent-coral to-accent-teal">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main CTA */}
        <div className="mb-8">
          <div className="text-6xl mb-6">🎁</div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Try Your First Clip 
            <span className="text-white/90"> FREE</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Transform your favorite memory right now. No credit card required. 
            No signup needed. Ready in just 2 minutes.
          </p>
          
          <button 
            onClick={handleSmartLogin}
            disabled={isLoading}
            className="bg-white text-deep-charcoal font-bold text-xl px-12 py-5 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Upload Your Photo Now'}
          </button>
          

        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-white/95 rounded-2xl p-6 border border-light-border shadow-lg">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="font-semibold text-primary mb-2">Ready in Minutes</h3>
            <p className="text-secondary text-sm">Fast processing, instant results</p>
          </div>
          <div className="bg-white/95 rounded-2xl p-6 border border-light-border shadow-lg">
            <div className="text-2xl mb-3">💝</div>
            <h3 className="font-semibold text-primary mb-2">Perfect Gifts</h3>
            <p className="text-secondary text-sm">Unforgettable presents for loved ones</p>
          </div>
          <div className="bg-white/95 rounded-2xl p-6 border border-light-border shadow-lg">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="font-semibold text-primary mb-2">100% Secure</h3>
            <p className="text-secondary text-sm">Your photos stay private and safe</p>
          </div>
        </div>
      </div>
    </section>
  )
} 
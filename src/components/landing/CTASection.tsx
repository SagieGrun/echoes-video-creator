'use client'

import { useRouter } from 'next/navigation'
import { getAppUrl } from '@/lib/utils'

export function CTASection() {
  const router = useRouter()

  const handleTryFree = () => {
    const appUrl = getAppUrl()
    router.push(`/login?redirect=${encodeURIComponent(appUrl)}`)
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-amber-100 to-rose-100">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main CTA */}
        <div className="bg-white/95 rounded-3xl shadow-xl p-12 mb-8 border border-rose-200">
          <div className="text-6xl mb-6">🎁</div>
          <h2 className="text-4xl md:text-5xl font-bold text-amber-900 mb-6">
            Try Your First Clip 
            <span className="text-orange-600"> FREE</span>
          </h2>
          <p className="text-xl text-rose-800 mb-8 max-w-2xl mx-auto">
            Transform your favorite memory right now. No credit card required. 
            No signup needed. Ready in just 2 minutes.
          </p>
          
          <button 
            onClick={handleTryFree}
            className="inline-block bg-gradient-to-r from-orange-500 to-rose-400 hover:from-orange-600 hover:to-rose-500 text-white font-bold text-xl px-12 py-5 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-6"
          >
            Upload Your Photo Now
          </button>
          
          <p className="text-rose-700 text-sm">
            After your free clip, purchase a pack to create more magical videos. Packs start at just $15 for 5 credits (enough for a 25-second video).
          </p>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="bg-white/95 rounded-2xl p-6 border border-rose-200 shadow-lg">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="font-semibold text-amber-900 mb-2">Ready in Minutes</h3>
            <p className="text-rose-800 text-sm">Fast processing, instant results</p>
          </div>
          <div className="bg-white/95 rounded-2xl p-6 border border-rose-200 shadow-lg">
            <div className="text-2xl mb-3">💝</div>
            <h3 className="font-semibold text-amber-900 mb-2">Perfect Gifts</h3>
            <p className="text-rose-800 text-sm">Unforgettable presents for loved ones</p>
          </div>
          <div className="bg-white/95 rounded-2xl p-6 border border-rose-200 shadow-lg">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="font-semibold text-amber-900 mb-2">100% Secure</h3>
            <p className="text-rose-800 text-sm">Your photos stay private and safe</p>
          </div>
        </div>
      </div>
    </section>
  )
} 
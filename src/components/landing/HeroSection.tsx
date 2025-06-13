'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAppUrl } from '@/lib/utils'

export function HeroSection() {
  const router = useRouter()

  const handleTryFree = () => {
    const appUrl = getAppUrl()
    router.push(`/login?redirect=${encodeURIComponent(appUrl)}`)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden pt-16">
      {/* Background with subtle animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-rose-200 to-purple-200">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Main Content */}
          <div className="text-center lg:text-left">
            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-orange-900 mb-6 leading-tight">
              Bring Your 
              <span className="block bg-gradient-to-r from-coral-500 to-rose-400 bg-clip-text text-transparent">
                Memories to Life
              </span>
            </h2>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-rose-700 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Transform your cherished photos into magical AI-animated videos. 
              Perfect for creating heartfelt gifts.
            </p>

            {/* Primary CTA */}
            <div className="mb-8 text-center lg:text-left">
              <button 
                onClick={handleTryFree}
                className="inline-block bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-4"
              >
                Try Your First Clip FREE
              </button>
              
              <p className="text-rose-700 text-base font-medium">
                🚀 Ready in 2 minutes
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-8 text-orange-800 text-base">
              <div className="flex items-center gap-3">
                <span className="text-orange-600 text-lg">🔒</span>
                <span className="font-medium">Privacy-first</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-orange-600 text-lg">📱</span>
                <span className="font-medium">Works on any device</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-orange-600 text-lg">⚡</span>
                <span className="font-medium">Professional quality</span>
              </div>
            </div>
          </div>

          {/* Right Side - Before/After Demo */}
          <div className="lg:order-last">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-rose-200 relative">
              <h3 className="text-xl font-semibold text-orange-800 mb-6 text-center">
                Watch the Magic Happen 🎬
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before - Static Photo */}
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-2 shadow-lg mb-4">
                    <div className="aspect-square relative overflow-hidden rounded-xl">
                      <Image
                        src="/examples/family-photo.jpg"
                        alt="Beautiful family memory - grandparents with baby"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                        priority
                      />
                      {/* Static indicator */}
                      <div className="absolute top-3 right-3 bg-orange-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                        Static
                      </div>
                    </div>
                  </div>
                  <p className="text-rose-600 font-medium">BEFORE</p>
                </div>

                {/* After - Animated Video */}
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-2 shadow-lg mb-4 relative">
                    <div className="aspect-square relative overflow-hidden rounded-xl">
                      <video
                        src="/examples/family-photo-animated.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {/* Animated indicator */}
                      <div className="absolute top-3 right-3 bg-coral-500 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 font-medium">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Live
                      </div>
                    </div>
                  </div>
                  <p className="text-coral-500 font-medium">AFTER</p>
                </div>
              </div>

              {/* Arrow between before/after */}
              <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-coral-400 text-white rounded-full p-3 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-orange-800 text-base font-medium">
                  🎬 Real family memories brought to life with gentle, natural animation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof - moved to bottom */}
        <div className="text-center mt-16">
          <div className="flex justify-center items-center gap-1 mb-3">
            {[1,2,3,4,5].map((star) => (
              <span key={star} className="text-orange-400 text-xl">★</span>
            ))}
          </div>
          <p className="text-orange-800 text-base font-medium">
            Loved by 1,000+ families worldwide
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-orange-800 animate-bounce">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium">See how it works</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  )
} 
'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useSmartLogin } from '@/hooks/useSmartLogin'

export function HeroSection() {
  const { handleSmartLogin, isLoading } = useSmartLogin()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Ensure video plays after component mounts
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      // Try to play the video, handle any errors gracefully
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Video autoplay failed:', error)
          // Autoplay was prevented, but that's okay
        })
      }
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden pt-16">
      {/* Background with subtle animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-rose-300 to-orange-300">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Main Content */}
          <div className="text-center lg:text-left">
            {/* Main Headline with Logo */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-900 mb-6 leading-tight text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-6 mb-2">
                <span>Bring Your</span>
                <img 
                  src="/echoes-logo.png" 
                  alt="Echoes Logo" 
                  className="h-12 w-12 md:h-16 md:w-16 lg:h-20 lg:w-20"
                />
              </div>
              <span className="block bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-transparent">
                Memories to Life
              </span>
            </h2>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-rose-800 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Transform your cherished photos into magical AI-animated videos. 
              Perfect for creating heartfelt gifts.
            </p>

            {/* Primary CTA */}
            <div className="mb-8 text-center lg:text-left">
              <button 
                onClick={handleSmartLogin}
                disabled={isLoading}
                className="inline-block bg-gradient-to-r from-orange-500 to-rose-400 hover:from-orange-600 hover:to-rose-500 text-white font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Try Your First Clip FREE'}
              </button>
              
              <p className="text-rose-800 text-base font-medium">
                🚀 Ready in 2 minutes
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-8 text-amber-900 text-base">
              <div className="flex items-center gap-3">
                <span className="text-amber-700 text-lg">🔒</span>
                <span className="font-medium">Privacy-first</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-700 text-lg">📱</span>
                <span className="font-medium">Works on any device</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-700 text-lg">⚡</span>
                <span className="font-medium">Professional quality</span>
              </div>
            </div>
          </div>

          {/* Right Side - Before/After Demo */}
          <div className="lg:order-last">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-rose-300 relative shadow-xl">
              <h3 className="text-xl font-semibold text-amber-900 mb-6 text-center">
                Watch the Magic Happen 🎬
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before - Static Photo */}
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-2 shadow-lg mb-4">
                    <div className="aspect-square relative overflow-hidden rounded-xl">
                      <img
                        src="/examples/family-photo.jpg"
                        alt="Beautiful family memory - grandparents with baby"
                        className="w-full h-full object-cover"
                      />
                      {/* Static indicator */}
                      <div className="absolute top-3 right-3 bg-amber-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                        Static
                      </div>
                    </div>
                  </div>
                  <p className="text-rose-700 font-medium">BEFORE</p>
                </div>

                {/* After - Animated Video */}
                <div className="text-center">
                  <div className="bg-white rounded-2xl p-2 shadow-lg mb-4 relative">
                    <div className="aspect-square relative overflow-hidden rounded-xl">
                      <video
                        ref={videoRef}
                        src="/examples/family-photo-animated.mp4"
                        poster="/examples/family-photo.jpg"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        controls={false}
                        disablePictureInPicture
                        className="w-full h-full object-cover"
                        onError={() => console.log('Video failed to load')}
                        onLoadStart={() => console.log('Video loading started')}
                        onCanPlay={() => console.log('Video can play')}
                      />
                      {/* Animated indicator */}
                      <div className="absolute top-3 right-3 bg-orange-500 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 font-medium">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Live
                      </div>
                    </div>
                  </div>
                  <p className="text-orange-600 font-medium">AFTER</p>
                </div>
              </div>

              {/* Arrow between before/after */}
              <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-orange-500 text-white rounded-full p-3 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-amber-900 text-base font-medium">
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
              <span key={star} className="text-amber-500 text-xl">★</span>
            ))}
          </div>
          <p className="text-amber-900 text-base font-medium">
            Loved by 1,000+ families worldwide
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-amber-900 animate-bounce">
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
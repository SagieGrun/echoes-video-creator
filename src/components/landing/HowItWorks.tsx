'use client'

import { useSmartLogin } from '@/hooks/useSmartLogin'
import { Camera, Cpu, Video } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export function HowItWorks() {
  const { handleSmartLogin, isLoading } = useSmartLogin()
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="how-it-works" className="section-clean py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            How It Works
          </h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            Transform your memories in three simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Step 1 */}
          <div className={`text-center transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}`}>
            <div className="group relative w-24 h-24 bg-gradient-to-r from-accent-coral to-accent-teal rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl hover:shadow-accent-coral/25 transition-all duration-500 hover:scale-125 cursor-pointer hover:rotate-6">
              <Camera className="w-10 h-10 text-white group-hover:scale-125 transition-transform duration-500" />
              {/* Floating animation indicator */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-coral rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                1
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-primary mb-4">Upload Photos</h3>
            <p className="text-subtle leading-relaxed">
              Select your favorite nostalgic photos from your phone or computer. 
              We support all common formats.
            </p>
          </div>

          {/* Step 2 */}
          <div className={`text-center transition-all duration-1000 delay-500 transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}`}>
            <div className="group relative w-24 h-24 bg-gradient-to-r from-accent-coral to-accent-teal rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl hover:shadow-accent-teal/25 transition-all duration-500 hover:scale-125 cursor-pointer hover:rotate-6">
              <Cpu className="w-10 h-10 text-white group-hover:scale-125 transition-transform duration-500 group-hover:animate-pulse" />
              {/* Floating animation indicator */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-teal rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce delay-150">
                2
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-primary mb-4">AI Animation</h3>
            <p className="text-subtle leading-relaxed">
              Our AI analyzes your photos and creates smooth, natural animations 
              that bring your memories to life.
            </p>
          </div>

          {/* Step 3 */}
          <div className={`text-center transition-all duration-1000 delay-1000 transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}`}>
            <div className="group relative w-24 h-24 bg-gradient-to-r from-accent-coral to-accent-teal rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl hover:shadow-accent-coral/25 transition-all duration-500 hover:scale-125 cursor-pointer hover:rotate-6">
              <Video className="w-10 h-10 text-white group-hover:scale-125 transition-transform duration-500" />
              {/* Floating animation indicator */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-accent-coral to-accent-teal rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce delay-300">
                3
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-primary mb-4">Download & Share</h3>
            <p className="text-subtle leading-relaxed">
              Get your beautiful animated video in minutes and share it with 
              family and friends across all platforms.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center transition-all duration-1000 delay-1500 transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}`}>
          <button 
            onClick={handleSmartLogin}
            disabled={isLoading}
            className="btn-gradient text-lg px-8 py-4 hover:shadow-2xl hover:shadow-accent-coral/25 transition-all duration-500 hover:scale-110 transform"
          >
            {isLoading ? 'Loading...' : 'Start Creating Now'}
          </button>
        </div>
      </div>
    </section>
  )
} 
'use client'

import { useRouter } from 'next/navigation'
import { getAppUrl } from '@/lib/utils'

export function HowItWorks() {
  const router = useRouter()

  const handleTryFree = () => {
    const appUrl = getAppUrl()
    router.push(`/login?redirect=${encodeURIComponent(appUrl)}`)
  }
  const steps = [
    {
      number: '01',
      icon: '📸',
      title: 'Upload Your Memory',
      description: 'Choose any portrait photo from your phone or computer. Family photos, wedding moments, or precious memories work best.'
    },
    {
      number: '02', 
      icon: '🤖',
      title: 'AI Magic Happens',
      description: 'Our advanced AI creates natural, lifelike animation that brings your photo to life with gentle, realistic movement.'
    },
    {
      number: '03',
      icon: '🎬', 
      title: 'Download & Share',
      description: 'Get your magical video in minutes, ready to share with loved ones or save forever as a cherished memory.'
    }
  ]

  return (
    <section id="how-it-works" className="py-20 px-4 bg-gradient-to-br from-orange-50 to-rose-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
            How It Works
          </h2>
          <p className="text-xl text-rose-700 max-w-2xl mx-auto">
            Transform your memories in three simple steps. No technical skills needed.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="text-center group">
              {/* Step Number */}
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-coral-300 to-rose-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>
                
                {/* Connector Line (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-coral-300 to-rose-200 opacity-40 transform -translate-y-1/2"></div>
                )}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-orange-800 mb-4">
                {step.title}
              </h3>
              <p className="text-rose-700 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button 
            onClick={handleTryFree}
            className="bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Creating Now
          </button>
        </div>
      </div>
    </section>
  )
} 
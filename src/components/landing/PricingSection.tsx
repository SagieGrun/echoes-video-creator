'use client'

import { useState, useEffect } from 'react'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  is_active: boolean
}

export function PricingSection() {
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Highlight the middle package (ID 2) as most popular
  const mostPopularId = '2'

  useEffect(() => {
    fetchCreditPacks()
  }, [])

  const fetchCreditPacks = async () => {
    try {
      const response = await fetch('/api/credits')
      const data = await response.json()
      
      if (data.packs) {
        // Packs are already filtered to active ones by API
        setCreditPacks(data.packs)
      }
    } catch (error) {
      console.error('Error fetching credit packs:', error)
      setError('Failed to load pricing information')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(0)}`
  }

  const getPackDescription = (pack: CreditPack): string => {
    // Generate descriptions based on package characteristics
    if (pack.credits <= 5) {
      return 'Perfect for social media sharing'
    } else if (pack.credits <= 20) {
      return 'Best for heartfelt presents'
    } else {
      return 'For digital frames & keepsakes'
    }
  }

  const getPackFeatures = (pack: CreditPack): string[] => {
    const baseFeatures = [
      `${pack.credits} animated clips (${Math.floor(pack.credits * 5 / 60)}:${String(pack.credits * 5 % 60).padStart(2, '0')} minutes)`,
      'High quality (1080p)',
      'No watermark',
      'Commercial license'
    ]

    // Add package-specific features
    if (pack.credits <= 5) {
      return [
        ...baseFeatures,
        'Ideal for Instagram/TikTok',
        'Quick emotional impact',
        'Perfect for single moments'
      ]
    } else if (pack.credits <= 20) {
      return [
        ...baseFeatures,
        'Perfect for birthday gifts',
        'Great for family events',
        'Tell a complete story',
        'Family sharing included'
      ]
    } else {
      return [
        ...baseFeatures,
        'Ideal for digital frames',
        'Perfect for photo albums',
        'Complete family stories',
        'Ultra HD quality (4K)',
        'Family sharing included'
      ]
    }
  }

  const getCTAText = (pack: CreditPack): string => {
    if (pack.credits <= 5) {
      return 'Start Creating'
    } else if (pack.credits <= 20) {
      return `Get ${pack.name}`
    } else {
      return `Get ${pack.name}`
    }
  }

  if (loading) {
    return (
      <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-rose-50 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
              Create Lasting Memories
            </h2>
            <p className="text-xl text-rose-700 max-w-2xl mx-auto">
              Each credit creates a 5-second animated clip. Choose the perfect length for your story.
            </p>
          </div>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-rose-600">Loading pricing...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-rose-50 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
              Create Lasting Memories
            </h2>
            <p className="text-xl text-rose-700 max-w-2xl mx-auto">
              Each credit creates a 5-second animated clip. Choose the perfect length for your story.
            </p>
          </div>
          <div className="text-center">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-rose-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
            Create Lasting Memories
          </h2>
          <p className="text-xl text-rose-700 max-w-2xl mx-auto">
            Each credit creates a 5-second animated clip. Choose the perfect length for your story.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {creditPacks.map((pack) => {
            const isPopular = pack.id === mostPopularId
            const features = getPackFeatures(pack)
            
            return (
              <div 
                key={pack.id} 
                className={`relative rounded-3xl p-8 transition-all duration-300 hover:scale-105 ${
                  isPopular 
                    ? 'bg-white border-2 border-coral-400 shadow-lg' 
                    : 'bg-white/90 border border-rose-100 shadow-md'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-coral-400 to-rose-300 text-white px-5 py-2 rounded-full text-base font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-orange-800 mb-2">
                    {pack.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-coral-500">{formatPrice(pack.price_cents)}</span>
                    <span className="text-rose-600 ml-1">/{pack.credits} credits</span>
                  </div>
                  <p className="text-rose-700">{getPackDescription(pack)}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-coral-400 mr-3 text-lg font-bold">✓</span>
                      <span className="text-rose-700 text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button 
                  className={`w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                    isPopular
                      ? 'bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white shadow-lg'
                      : 'bg-white border-2 border-coral-400 text-coral-500 hover:bg-coral-50'
                  }`}
                >
                  {getCTAText(pack)}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
} 
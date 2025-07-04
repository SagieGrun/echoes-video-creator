'use client'

import { useState, useEffect, useRef } from 'react'

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
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  // Highlight the middle package (ID 2) as most popular
  const mostPopularId = '2'

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetchCreditPacks()
  }, [])

  // Auto-show cards after data loads as fallback
  useEffect(() => {
    if (creditPacks.length > 0 && !isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [creditPacks, isVisible])

  const fetchCreditPacks = async () => {
    try {
      console.log('Fetching credit packs...')
      const response = await fetch('/api/credits')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Credit packs response:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (data.packs && Array.isArray(data.packs)) {
        // Packs are already filtered to active ones by API
        setCreditPacks(data.packs)
        console.log('Credit packs loaded successfully:', data.packs.length)
      } else {
        console.error('Invalid packs data:', data)
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error fetching credit packs:', error)
      // Fall back to default packs if API fails
      const defaultPacks = [
        { id: '1', name: 'Starter Pack', credits: 10, price_cents: 2000, is_active: true },
        { id: '2', name: 'Standard Pack', credits: 30, price_cents: 4500, is_active: true },
        { id: '3', name: 'Premium Pack', credits: 50, price_cents: 6000, is_active: true }
      ]
      setCreditPacks(defaultPacks)
      console.log('Using default packs as fallback')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(0)}`
  }

  const calculatePricePerCredit = (price_cents: number, credits: number): string => {
    return `$${(price_cents / 100 / credits).toFixed(2)}`
  }

  const getPackDescription = (pack: CreditPack): string => {
    // Map based on actual database packages
    switch (pack.name) {
      case 'Starter Pack':
        return 'Perfect for birthday gifts'
      case 'Standard Pack':
        return 'Perfect for events'
      case 'Premium Pack':
        return 'The best option for digital frames'
      default:
        return 'Great for creating memories'
    }
  }

  const getPackFeatures = (pack: CreditPack): string[] => {
    // Get video duration based on actual packages
    const getVideoDuration = (packName: string): string => {
      switch (packName) {
        case 'Starter Pack':
          return '~ 1 minute video'
        case 'Standard Pack':
          return '~ 2:30 minute video'
        case 'Premium Pack':
          return '~ 4 minute video'
        default:
          return `~ ${Math.floor(pack.credits * 5 / 60)} minute video`
      }
    }

    const baseFeatures = [
      `${pack.credits} animated clips (${Math.floor(pack.credits * 5 / 60)}:${String(pack.credits * 5 % 60).padStart(2, '0')} minutes)`,
      getVideoDuration(pack.name),
      'Professional quality',
      'No watermark',
      'Commercial license'
    ]

    // Add package-specific features based on actual packages
    switch (pack.name) {
      case 'Starter Pack':
        return [
          ...baseFeatures,
          'Perfect for birthday gifts'
        ]
      case 'Standard Pack':
        return [
          ...baseFeatures,
          'Perfect for events',
          'Best for sharing with family'
        ]
      case 'Premium Pack':
        return [
          ...baseFeatures,
          'The best option for digital frames',
          'Best Value'
        ]
      default:
        return baseFeatures
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
      <section id="pricing" className="section-clean py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
              Create Lasting Memories
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              Each credit creates a 5-second animated clip. Choose the perfect length for your story.
            </p>
          </div>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-coral mx-auto mb-4"></div>
            <p className="text-subtle">Loading pricing...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="pricing" className="section-clean py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
              Create Lasting Memories
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
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
    <section ref={sectionRef} id="pricing" className="section-soft py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            Create Lasting Memories
          </h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            Each credit creates a 5-second animated clip. Choose the perfect length for your story.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {creditPacks.map((pack, index) => {
            const isPopular = pack.id === mostPopularId
            const features = getPackFeatures(pack)
            
            return (
              <div 
                key={pack.id} 
                className={`relative rounded-3xl p-8 transition-all duration-1000 hover:scale-105 transform ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                } ${
                  isPopular 
                    ? 'card-accent' 
                    : 'card-clean'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent-coral text-white px-5 py-2 rounded-full text-base font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-primary mb-2">
                    {pack.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-accent-coral">{formatPrice(pack.price_cents)}</span>
                    <span className="text-subtle ml-1">/{pack.credits} credits</span>
                  </div>
                  <p className="text-secondary">{getPackDescription(pack)}</p>
                  <div className="text-sm text-subtle mt-2">
                    {calculatePricePerCredit(pack.price_cents, pack.credits)} per credit
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-accent-teal mr-3 text-lg font-bold">✓</span>
                      <span className="text-secondary text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button className="btn-primary w-full">
                  {getCTAText(pack)}
                </button>
              </div>
            )
          })}
        </div>

        {/* Trust indicators */}
        <div className="text-center mt-16">
          <div className="flex justify-center items-center gap-8 text-subtle">
            <div className="flex items-center gap-2">
              <span className="text-accent-teal">🔒</span>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-teal">⚡</span>
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-teal">💫</span>
              <span>No Watermark</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 
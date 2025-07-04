'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  is_active: boolean
  gumroad_permalink?: string
}

interface CreditPurchaseProps {
  onClose?: () => void
  onPurchaseComplete?: (credits: number) => void
}

export function CreditPurchase({ onClose, onPurchaseComplete }: CreditPurchaseProps) {
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Map credit pack IDs to Gumroad permalinks
  const gumroadPermalinks: Record<string, string> = {
    '1': 'hwllt',     // Starter Package - $15 for 5 credits
    '2': 'zqbix',     // Social Pack - $45 for 20 credits  
    '3': 'nyoppm'     // Legacy Pack - $80 for 40 credits
  }

  useEffect(() => {
    fetchCreditPacks()
  }, [])

  const fetchCreditPacks = async () => {
    try {
      const response = await fetch('/api/credits')
      const data = await response.json()
      
      if (data.packs) {
        // Add Gumroad permalinks (packs are already filtered to active ones by API)
        const packsWithPermalinks = data.packs.map((pack: CreditPack) => ({
          ...pack,
          gumroad_permalink: gumroadPermalinks[pack.id]
        }))
        setCreditPacks(packsWithPermalinks)
      }
    } catch (error) {
      console.error('Error fetching credit packs:', error)
      setError('Failed to load credit packs')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const calculatePricePerCredit = (price_cents: number, credits: number): string => {
    return `$${(price_cents / 100 / credits).toFixed(2)}`
  }

  // Highlight the middle package (Social Pack - ID 2) as most popular
  const mostPopularId = '2'

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading credit packs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Load Gumroad JS once */}
      <Script src="https://gumroad.com/js/gumroad.js" />
      
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Purchase Credits</h2>
                <p className="text-gray-600 mt-1">Choose a credit pack to continue creating clips</p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {creditPacks.map((pack) => (
                <div
                  key={pack.id}
                  className={`relative border-2 rounded-lg p-6 text-center ${
                    pack.id === mostPopularId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {pack.id === mostPopularId && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {pack.name}
                  </h3>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {formatPrice(pack.price_cents)}
                    </div>
                    <div className="text-lg text-gray-600">
                      {pack.credits} credits
                    </div>
                    <div className="text-sm text-gray-500">
                      {calculatePricePerCredit(pack.price_cents, pack.credits)} per credit
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 text-sm text-gray-600">
                    <div>✓ {pack.credits} AI-generated clips</div>
                    <div>✓ High-quality downloads</div>
                    <div>✓ No expiration</div>
                    {pack.credits >= 20 && <div>✓ Best value deal</div>}
                  </div>

                  {/* Gumroad Custom Button */}
                  {pack.gumroad_permalink ? (
                    <a
                      href={`https://sagiegrun.gumroad.com/l/${pack.gumroad_permalink}`}
                      className={`w-full py-3 px-6 rounded-lg font-medium transition-colors block text-center no-underline ${
                        pack.id === mostPopularId
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                      data-gumroad-single-product="true"
                    >
                      Purchase {pack.name}
                    </a>
                  ) : (
                    <div className="w-full py-3 px-6 rounded-lg bg-gray-100 text-gray-400 text-center">
                      Coming Soon
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>💳 Secure payment processing via Gumroad</p>
              <p className="mt-1">Credits never expire and can be used anytime</p>
              <p className="mt-2 text-xs text-gray-400">
                After purchase, credits will be added to your account automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  is_active: boolean
  stripe_price_id?: string
}

interface CreditPurchaseProps {
  onClose?: () => void
  onPurchaseComplete?: (credits: number) => void
}

export function CreditPurchase({ onClose, onPurchaseComplete }: CreditPurchaseProps) {
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCreditPacks()
  }, [])

  const fetchCreditPacks = async () => {
    try {
      const response = await fetch('/api/admin/credits')
      const data = await response.json()
      
      if (data.packs) {
        // Filter only active packs
        const activePacks = data.packs.filter((pack: CreditPack) => pack.is_active)
        setCreditPacks(activePacks)
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

  const handlePurchase = async (pack: CreditPack) => {
    try {
      setPurchasing(pack.id)
      setError(null)

      // TODO: Integrate with Stripe payment processing
      // For now, simulate purchase
      console.log('Would purchase pack:', pack)
      
      // Simulate success
      setTimeout(() => {
        setPurchasing(null)
        onPurchaseComplete?.(pack.credits)
        onClose?.()
      }, 2000)

    } catch (error) {
      console.error('Error purchasing credits:', error)
      setError('Failed to purchase credits. Please try again.')
      setPurchasing(null)
    }
  }

  const getBestValue = (): string | null => {
    if (creditPacks.length < 2) return null
    
    const bestPack = creditPacks.reduce((best, current) => {
      const bestPrice = best.price_cents / best.credits
      const currentPrice = current.price_cents / current.credits
      return currentPrice < bestPrice ? current : best
    })
    
    return bestPack.id
  }

  const bestValueId = getBestValue()

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
                  pack.id === bestValueId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {pack.id === bestValueId && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Best Value
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

                <button
                  onClick={() => handlePurchase(pack)}
                  disabled={purchasing === pack.id}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    pack.id === bestValueId
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {purchasing === pack.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    `Purchase ${pack.name}`
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>💳 Secure payment processing via Stripe</p>
            <p className="mt-1">Credits never expire and can be used anytime</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
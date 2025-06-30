'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Gift, X } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  credit_balance: number
}

interface Props {
  user: User | null
}

export function ReferralBanner({ user }: Props) {
  const [showBanner, setShowBanner] = useState(false)
  const [isReferred, setIsReferred] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return

    const checkReferralStatus = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Check if user was referred (exists in referrals table as referred_id)
        const { data: referralData } = await supabase
          .from('referrals')
          .select('id, reward_granted')
          .eq('referred_id', user.id)
          .single()

        if (referralData) {
          setIsReferred(true)
          
          // Show banner if:
          // 1. User was referred AND
          // 2. They haven't earned the referral reward yet (haven't made first purchase) AND
          // 3. Banner hasn't been dismissed
          const bannerDismissed = localStorage.getItem(`referral-banner-dismissed-${user.id}`)
          if (!referralData.reward_granted && !bannerDismissed) {
            setShowBanner(true)
          }
        }
      } catch (error) {
        console.error('Error checking referral status:', error)
      }
    }

    checkReferralStatus()
  }, [user])

  const dismissBanner = () => {
    setDismissed(true)
    setShowBanner(false)
    if (user) {
      localStorage.setItem(`referral-banner-dismissed-${user.id}`, 'true')
    }
  }

  if (!showBanner || !isReferred || dismissed) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 relative">
        <button
          onClick={dismissBanner}
          className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-1">
              🎁 You were referred by a friend!
            </h3>
            <p className="text-blue-700">
              Purchase credits and get a <strong>+5 credit bonus</strong> on top of your purchase. 
              Your friend will also earn bonus credits when you make your first purchase!
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href="/earn-credits"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-sm"
            >
              Learn More
            </Link>
            <button
              onClick={() => {
                // Trigger credit purchase modal
                const event = new CustomEvent('openCreditPurchase')
                window.dispatchEvent(event)
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
            >
              Buy Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
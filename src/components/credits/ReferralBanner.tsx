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
        const { data: referralData, error } = await supabase
          .from('referrals')
          .select('id, reward_granted')
          .eq('referred_id', user.id)
          .maybeSingle()

        if (referralData && !error) {
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4 relative">
        <button
          onClick={dismissBanner}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center space-x-3 sm:space-x-4 pr-8">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-1">
              🎁 Friend Referred You!
            </h3>
            <p className="text-blue-700 text-sm">
              Get <strong>+5 bonus credits</strong> with purchase<span className="hidden sm:inline">. Your friend earns too!</span>
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Link
              href="/earn-credits"
              className="px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm whitespace-nowrap hidden sm:block"
            >
              Learn More
            </Link>
            <button
              onClick={() => {
                // Trigger credit purchase modal
                const event = new CustomEvent('openCreditPurchase')
                window.dispatchEvent(event)
              }}
              className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm whitespace-nowrap"
            >
              Buy Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
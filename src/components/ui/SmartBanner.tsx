import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Gift, X, Film } from 'lucide-react'
import Link from 'next/link'
import { Button } from './button'

interface User {
  id: string
  email: string
  credit_balance: number
}

interface SmartBannerProps {
  user: User | null
  completedVideoId: string | null
  clips: any[]
  onDismissVideo: () => void
  onOpenCreditPurchase: () => void
  onStartCreating: () => void
  onViewVideo: () => void
}

type BannerType = 'video-complete' | 'referrer-success' | 'referral' | 'welcome' | 'low-credits' | null

export function SmartBanner({ 
  user, 
  completedVideoId, 
  clips, 
  onDismissVideo, 
  onOpenCreditPurchase, 
  onStartCreating, 
  onViewVideo 
}: SmartBannerProps) {
  const [bannerType, setBannerType] = useState<BannerType>(null)
  const [isReferred, setIsReferred] = useState(false)
  const [referralRewardGranted, setReferralRewardGranted] = useState(false)
  const [recentReferrerSuccess, setRecentReferrerSuccess] = useState(false)
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    const checkReferralStatus = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Check if user was referred
        const { data: referralData, error } = await supabase
          .from('referrals')
          .select('id, reward_granted')
          .eq('referred_id', user.id)
          .maybeSingle()

        if (referralData && !error) {
          setIsReferred(true)
          setReferralRewardGranted(referralData.reward_granted)
        }

        // Check if user has recent successful referrals (they are the referrer)
        const { data: referrerData, error: referrerError } = await supabase
          .from('referrals')
          .select('id, reward_granted, created_at')
          .eq('referrer_id', user.id)
          .eq('reward_granted', true)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

        if (referrerData && referrerData.length > 0 && !referrerError) {
          const recentSuccess = `referrer-success-${referrerData[0].id}`
          if (!dismissedBanners.has(recentSuccess)) {
            setRecentReferrerSuccess(true)
          }
        }
      } catch (error) {
        console.error('Error checking referral status:', error)
      }
    }

    checkReferralStatus()

    // Load dismissed banners from localStorage
    const dismissed = localStorage.getItem(`dismissed-banners-${user.id}`)
    if (dismissed) {
      setDismissedBanners(new Set(JSON.parse(dismissed)))
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    // Priority order (highest to lowest):
    // 1. Video completion (highest priority)
    // 2. Referrer success celebration (you earned credits from referrals!)
    // 3. Referral bonus (for referred users who haven't purchased)
    // 4. Welcome message (first-time users)
    // 5. Low credits warning (existing users)

    if (completedVideoId) {
      setBannerType('video-complete')
    } else if (recentReferrerSuccess) {
      setBannerType('referrer-success')
    } else if (isReferred && !referralRewardGranted && !dismissedBanners.has('referral')) {
      setBannerType('referral')
    } else if (user.credit_balance === 1 && clips.length === 0) {
      setBannerType('welcome')
    } else if (user.credit_balance <= 2 && clips.length > 0 && !dismissedBanners.has('low-credits')) {
      setBannerType('low-credits')
    } else {
      setBannerType(null)
    }
  }, [user, completedVideoId, isReferred, referralRewardGranted, recentReferrerSuccess, clips, dismissedBanners])

  const dismissBanner = (bannerKey: string) => {
    const newDismissed = new Set(dismissedBanners)
    newDismissed.add(bannerKey)
    setDismissedBanners(newDismissed)
    
    if (user) {
      localStorage.setItem(`dismissed-banners-${user.id}`, JSON.stringify(Array.from(newDismissed)))
    }
  }

  if (!bannerType) return null

  return (
    <div className="mb-8">
      {/* Video Completion Banner */}
      {bannerType === 'video-complete' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-1">
                🎉 Video Complete!
              </h3>
              <p className="text-green-700 text-sm">
                Ready to view and share.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button variant="success" size="sm" onClick={onViewVideo} className="whitespace-nowrap">
                View Video
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismissVideo}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Referrer Success Banner */}
      {bannerType === 'referrer-success' && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3 sm:p-4 relative">
          <button
            onClick={() => {
              dismissBanner('referrer-success')
              setRecentReferrerSuccess(false)
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-3 sm:space-x-4 pr-8">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-emerald-900 mb-1">
                🎉 Referral Success!
              </h3>
              <p className="text-emerald-700 text-sm">
                You earned credits! <span className="hidden sm:inline">Keep sharing for more.</span>
              </p>
            </div>
            
            <div className="flex items-center">
              <Link href="/earn-credits">
                <Button variant="success" size="sm" className="whitespace-nowrap">
                  <Gift className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Share More</span>
                  <span className="sm:hidden">Share</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Referral Banner */}
      {bannerType === 'referral' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4 relative">
          <button
            onClick={() => dismissBanner('referral')}
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
            
            <div className="flex items-center space-x-2">
              <Link href="/earn-credits" className="hidden sm:block">
                <Button variant="success" size="sm" className="whitespace-nowrap">
                  <Gift className="w-4 h-4 mr-2" />
                  Learn More
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={onOpenCreditPurchase} className="whitespace-nowrap">
                Buy Credits
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      {bannerType === 'welcome' && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">🎉</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-1">
                Welcome to Echoes!
              </h3>
              <p className="text-blue-700 text-sm">
                You have 1 free credit to try<span className="hidden sm:inline"> creating your first AI video clip</span>.
              </p>
            </div>
            
            <div className="flex items-center">
              <Button variant="primary" size="sm" onClick={onStartCreating} className="whitespace-nowrap">
                Start Creating
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Low Credits Banner */}
      {bannerType === 'low-credits' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 sm:p-4 relative">
          <button
            onClick={() => dismissBanner('low-credits')}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-3 sm:space-x-4 pr-8">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">{user?.credit_balance}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-amber-900 mb-1">
                Running low!
              </h3>
              <p className="text-amber-700 text-sm">
                {user?.credit_balance} credit{user?.credit_balance !== 1 ? 's' : ''} left<span className="hidden sm:inline">. Get more to keep creating</span>.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link href="/earn-credits" className="hidden sm:block">
                <Button variant="success" size="sm" className="whitespace-nowrap">
                  <Gift className="w-4 h-4 mr-2" />
                  Free Credits
                </Button>
              </Link>
              <Button variant="warning" size="sm" onClick={onOpenCreditPurchase} className="whitespace-nowrap">
                Buy Credits
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
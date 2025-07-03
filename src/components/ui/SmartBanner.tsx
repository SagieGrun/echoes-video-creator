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

type BannerType = 'video-complete' | 'referral' | 'welcome' | 'low-credits' | null

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
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    const checkReferralStatus = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        const { data: referralData, error } = await supabase
          .from('referrals')
          .select('id, reward_granted')
          .eq('referred_id', user.id)
          .maybeSingle()

        if (referralData && !error) {
          setIsReferred(true)
          setReferralRewardGranted(referralData.reward_granted)
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
    // 2. Referral bonus (for referred users who haven't purchased)
    // 3. Welcome message (first-time users)
    // 4. Low credits warning (existing users)

    if (completedVideoId) {
      setBannerType('video-complete')
    } else if (isReferred && !referralRewardGranted && !dismissedBanners.has('referral')) {
      setBannerType('referral')
    } else if (user.credit_balance === 1 && clips.length === 0) {
      setBannerType('welcome')
    } else if (user.credit_balance <= 2 && clips.length > 0 && !dismissedBanners.has('low-credits')) {
      setBannerType('low-credits')
    } else {
      setBannerType(null)
    }
  }, [user, completedVideoId, isReferred, referralRewardGranted, clips, dismissedBanners])

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
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-1">
                🎉 Video Compilation Complete!
              </h3>
              <p className="text-green-700">
                Your final video is ready and has been added to your collection.
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="success" size="sm" onClick={onViewVideo}>
                View Video
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismissVideo}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Banner */}
      {bannerType === 'referral' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 relative">
          <button
            onClick={() => dismissBanner('referral')}
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
                Your friend will also earn bonus credits!
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/earn-credits">
                <Button variant="success" size="sm">
                  <Gift className="w-4 h-4 mr-2" />
                  Learn More
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={onOpenCreditPurchase}>
                Buy Credits
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      {bannerType === 'welcome' && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">🎉</span>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                Welcome to Echoes!
              </h3>
              <p className="text-blue-700">
                You have 1 free credit to try creating your first AI video clip. Transform any photo into a cinematic moment!
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="primary" size="sm" onClick={onStartCreating}>
                Start Creating
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Low Credits Banner */}
      {bannerType === 'low-credits' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 relative">
          <button
            onClick={() => dismissBanner('low-credits')}
            className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">{user?.credit_balance}</span>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-1">
                Running low on credits!
              </h3>
              <p className="text-amber-700">
                You have {user?.credit_balance} credit{user?.credit_balance !== 1 ? 's' : ''} left. 
                Get more credits to keep creating amazing videos.
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/earn-credits">
                <Button variant="success" size="sm">
                  <Gift className="w-4 h-4 mr-2" />
                  Get Free Credits
                </Button>
              </Link>
              <Button variant="warning" size="sm" onClick={onOpenCreditPurchase}>
                Buy Credits
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
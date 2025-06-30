'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ArrowLeft, Copy, Share2, Users, Gift, CheckCircle, ExternalLink, Facebook, Twitter, Instagram } from 'lucide-react'
import Link from 'next/link'
import { AnimatedCreditBalance } from '@/components/ui/AnimatedCreditBalance'

interface User {
  id: string
  email: string
  referralCode: string
  credits: number
  createdAt: string
}

interface Rewards {
  referral: number
  share: number
}

interface Stats {
  totalReferrals: number
  rewardedReferrals: number
  pendingReferrals: number
  hasEarnedShareReward: boolean
}

interface Props {
  user: User
  rewards: Rewards
  stats: Stats
}

export default function EarnCreditsClient({ user, rewards, stats }: Props) {
  const router = useRouter()
  const [copiedLink, setCopiedLink] = useState(false)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [shareSubmitted, setShareSubmitted] = useState(stats.hasEarnedShareReward)
  const [currentCredits, setCurrentCredits] = useState(user.credits)

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}?ref=${user.referralCode}`
  
  // Referral tracking is now handled globally by ReferralTracker component

  // Set up real-time credit updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    
    const channel = supabase
      .channel('credit-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new && 'credit_balance' in payload.new) {
            setCurrentCredits(payload.new.credit_balance)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = referralLink
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'instagram') => {
    const message = `Check out Echoes Video Creator - turn your photos into amazing AI videos! 🎬✨`
    const url = referralLink
    
    let shareUrl = ''
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`
        break
      case 'instagram':
        // Instagram doesn't support direct sharing, so we'll copy the message
        navigator.clipboard.writeText(`${message} ${url}`)
        alert('Link copied! Open Instagram and paste in your story or post.')
        return
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes')
    }
  }

  const submitShareForReward = async () => {
    if (shareSubmitted || shareSubmitting) return
    
    setShareSubmitting(true)
    
    try {
      const supabase = createSupabaseBrowserClient()
      
      // Simple share submission (no complex tracking)
      const { data: result, error } = await supabase.rpc('submit_share_for_reward', {
        target_user_id: user.id
      })
      
      if (error) {
        console.error('Error submitting share:', error)
        alert('Error submitting share. Please try again.')
        return
      }
      
      // Handle response
      if (result.success) {
        setShareSubmitted(true)
        
        // Show success message with earned credits
        const creditsEarned = result.credits_awarded || rewards.share
        alert(`🎉 Success! You earned ${creditsEarned} credits for sharing!`)
        
        // Update local credits display will happen via real-time subscription
      } else {
        // Simple error handling
        if (result.reason === 'already_claimed') {
          alert('You have already claimed your share reward!')
          setShareSubmitted(true) // Update UI to reflect already claimed
        } else {
          alert('Could not process share reward. Please try again later.')
        }
      }
      
    } catch (error) {
      console.error('Error in share submission:', error)
      alert('Error submitting share. Please try again.')
    } finally {
      setShareSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-amber-200/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 text-amber-700 hover:text-amber-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <AnimatedCreditBalance userId={user.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white mb-4">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Earn Free Credits</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Share Echoes with friends or on social media to earn free credits and create more amazing videos!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.rewardedReferrals}</div>
                <div className="text-sm text-gray-600">Successful Referrals</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.rewardedReferrals * rewards.referral}</div>
                <div className="text-sm text-gray-600">Credits Earned</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-amber-200/50">
            <div className="flex items-center space-x-3">
              <Share2 className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{shareSubmitted ? rewards.share : 0}</div>
                <div className="text-sm text-gray-600">Share Bonus</div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-amber-200/50">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900">Refer Friends</h2>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="space-y-2 text-blue-800">
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                  <span>Share your unique referral link with friends</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                  <span>When they purchase credits, you both get +{rewards.referral} bonus credits</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                  <span>No limit - earn {rewards.referral} credits for every friend who joins!</span>
                </li>
              </ol>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Your Referral Link:</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Social Sharing Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-amber-200/50">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Share2 className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-bold text-gray-900">Share on Social Media</h2>
              </div>
              {shareSubmitted && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Reward Earned!</span>
                </div>
              )}
            </div>
            
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="font-semibold text-purple-900 mb-2">One-time bonus:</h3>
              <p className="text-purple-800">
                Share Echoes on any social media platform to earn <strong>+{rewards.share} credits</strong> instantly!
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => shareOnSocial('facebook')}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Facebook className="w-5 h-5" />
                <span>Facebook</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => shareOnSocial('twitter')}
                className="flex items-center space-x-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
              >
                <Twitter className="w-5 h-5" />
                <span>Twitter</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => shareOnSocial('instagram')}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all"
              >
                <Instagram className="w-5 h-5" />
                <span>Instagram</span>
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {!shareSubmitted && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={submitShareForReward}
                  disabled={shareSubmitting}
                  className="w-full sm:w-auto px-8 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg font-medium transition-colors"
                >
                  {shareSubmitting ? 'Processing...' : `I Shared - Claim My +${rewards.share} Credits!`}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Share on any social platform and click to claim your reward.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Referrals */}
        {stats.pendingReferrals > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">{stats.pendingReferrals}</span>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Pending Referrals</h3>
                <p className="text-amber-700">
                  You have {stats.pendingReferrals} friend{stats.pendingReferrals > 1 ? 's' : ''} who signed up but haven't purchased credits yet. 
                  You'll earn +{rewards.referral} credits when they make their first purchase!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
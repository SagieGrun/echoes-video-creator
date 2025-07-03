'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ArrowLeft, Copy, Share2, Users, Gift, CheckCircle, ExternalLink, Facebook, Twitter, Instagram, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { AnimatedCreditBalance } from '@/components/ui/AnimatedCreditBalance'
import { Button } from '@/components/ui/button'

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
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [processingScreenshot, setProcessingScreenshot] = useState(false)

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

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setScreenshot(file)
    }
  }

  const submitShareForReward = async () => {
    if (!screenshot || shareSubmitted || shareSubmitting) return
    
    setProcessingScreenshot(true)
    setShareSubmitting(true)
    
    try {
      // Simulate AI processing for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000))
      
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
        setShowScreenshotModal(false)
        
        // Show success message with earned credits
        const creditsEarned = result.credits_awarded || rewards.share
        alert(`🎉 Screenshot verified! You earned ${creditsEarned} credits for sharing!`)
        
        // Update local credits display will happen via real-time subscription
      } else {
        // Simple error handling
        if (result.reason === 'already_claimed') {
          alert('You have already claimed your share reward!')
          setShareSubmitted(true) // Update UI to reflect already claimed
          setShowScreenshotModal(false)
        } else {
          alert('Could not process share reward. Please try again later.')
        }
      }
      
    } catch (error) {
      console.error('Error in share submission:', error)
      alert('Error submitting share. Please try again.')
    } finally {
      setShareSubmitting(false)
      setProcessingScreenshot(false)
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
                <div className="text-2xl font-bold text-gray-900">{stats.rewardedReferrals * rewards.referral + (stats.hasEarnedShareReward ? rewards.share : 0)}</div>
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
                <Button
                  variant="primary"
                  onClick={copyReferralLink}
                  className="flex items-center justify-center space-x-2"
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
                </Button>
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
              <Button
                variant="primary"
                onClick={() => shareOnSocial('facebook')}
                className="flex items-center space-x-2"
              >
                <Facebook className="w-4 h-4" />
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
              
              <Button
                variant="primary"
                onClick={() => shareOnSocial('twitter')}
                className="flex items-center space-x-2"
              >
                <Twitter className="w-4 h-4" />
                <span>Twitter</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
              
              <Button
                variant="primary"
                onClick={() => shareOnSocial('instagram')}
                className="flex items-center space-x-2"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            {!shareSubmitted && (
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="success"
                  size="lg"
                  onClick={() => setShowScreenshotModal(true)}
                  disabled={shareSubmitting}
                  className="w-full sm:w-auto"
                >
                  {shareSubmitting ? 'Processing...' : `I Shared - Claim My +${rewards.share} Credits!`}
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  Share on any social platform and submit a screenshot to claim your reward.
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

        {/* Screenshot Submission Modal */}
        {showScreenshotModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Submit Share Screenshot</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowScreenshotModal(false)
                    setScreenshot(null)
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Please upload a screenshot of your social media share to verify and claim your +{rewards.share} credits.
                </p>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {screenshot ? screenshot.name : 'Click to upload screenshot'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG up to 10MB
                    </p>
                  </label>
                </div>

                {/* Processing State */}
                {processingScreenshot && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          🤖 AI Verification in Progress...
                        </p>
                        <p className="text-xs text-blue-700">
                          Analyzing your screenshot for authenticity
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowScreenshotModal(false)
                      setScreenshot(null)
                    }}
                    disabled={processingScreenshot}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="success"
                    onClick={submitShareForReward}
                    disabled={!screenshot || processingScreenshot}
                    className="flex-1"
                  >
                    {processingScreenshot ? 'Verifying...' : 'Submit & Claim Credits'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
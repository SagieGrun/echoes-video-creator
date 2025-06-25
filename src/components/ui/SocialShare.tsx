'use client'

import { useState, useEffect } from 'react'
import { SocialSharingConfig } from '@/types/social'
import { 
  shareToSocialMedia, 
  shareWithWebAPI, 
  copyToClipboard,
  canUseWebShareAPI,
  isMobileDevice,
  ShareOptions 
} from '@/lib/social-sharing'
import { getSocialConfig } from '@/lib/social-config'
import { ChevronDown, Share } from 'lucide-react'

interface SocialShareProps {
  videoId: string
  title?: string
  className?: string
  directVideoUrl?: string // Optional: direct video URL for fallback
}

export function SocialShare({ videoId, title = "Check out my video!", className = "", directVideoUrl }: SocialShareProps) {
  const [config, setConfig] = useState<SocialSharingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sharingPlatform, setSharingPlatform] = useState<string | null>(null)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const config = await getSocialConfig()
      setConfig(config)
    } catch (error) {
      console.error('Failed to fetch social config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate permanent shareable URL with social media preview
  const getShareableUrl = () => {
    // Use a separate variable for social sharing that can be different from the main app URL
    const shareUrl = process.env.NEXT_PUBLIC_SHARE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const url = `${shareUrl}/preview/${videoId}`
    console.log('Generated share URL:', url, 'Share URL:', shareUrl)
    
    // For development/testing: if the share URL points to a non-existent domain,
    // you might want to use localhost for testing
    const isNonExistentDomain = shareUrl.includes('your-echoes.com')
    if (isNonExistentDomain && process.env.NODE_ENV === 'development') {
      console.log('Using localhost for testing since production domain is not deployed')
      return `${window.location.origin}/preview/${videoId}`
    }
    
    return url
  }

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'instagram') => {
    if (!config) return

    setSharingPlatform(platform)
    setShowDropdown(false)

    try {
      const shareableUrl = getShareableUrl()
      
      // For Facebook, if we have a direct video URL and the preview URL won't work, use direct URL
      const shouldUseDirectUrl = platform === 'facebook' && directVideoUrl && shareableUrl.includes('your-echoes.com')
      const finalUrl = shouldUseDirectUrl ? directVideoUrl : shareableUrl
      
      console.log(`Sharing to ${platform}:`, { shareableUrl, directVideoUrl, finalUrl, shouldUseDirectUrl })
      
      const shareOptions: ShareOptions = {
        videoUrl: finalUrl,
        appUrl: config.includeAppUrl ? (process.env.NEXT_PUBLIC_SHARE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : undefined
      }

      const result = await shareToSocialMedia(platform, config, shareOptions)

      if (result.success && result.url) {
        if (platform === 'instagram' && result.url.startsWith('instagram-share:')) {
          // Handle Instagram desktop sharing
          const message = decodeURIComponent(result.url.replace('instagram-share:', ''))
          await handleInstagramDesktopShare(message)
        } else {
          // Open sharing URL
          window.open(result.url, '_blank', 'noopener,noreferrer')
        }
      } else {
        console.error('Share failed:', result.error)
        // Fallback to Web Share API
        await handleWebShare()
      }
    } catch (error) {
      console.error('Share error:', error)
      // Fallback to Web Share API
      await handleWebShare()
    } finally {
      setSharingPlatform(null)
    }
  }

  const handleInstagramDesktopShare = async (message: string) => {
    const shareableUrl = getShareableUrl()
    const fullMessage = `${message}\n\n${shareableUrl}`
    const success = await copyToClipboard(fullMessage)
    
    if (success) {
      alert(
        'Message copied to clipboard!\n\n' +
        'To share on Instagram:\n' +
        '1. Go to Instagram.com\n' +
        '2. Create a new post or story\n' +
        '3. Paste the message from your clipboard'
      )
    } else {
      alert('Please copy this message and share it on Instagram:\n\n' + fullMessage)
    }
  }

  const handleWebShare = async () => {
    console.log('handleWebShare called, config:', config)
    if (!config) {
      console.log('No config available, using fallback')
      const shareableUrl = getShareableUrl()
      const result = await shareWithWebAPI(title, `Check out this video: ${shareableUrl}`, shareableUrl)
      
      if (!result.success) {
        console.log('Web Share API failed, copying to clipboard')
        const success = await copyToClipboard(shareableUrl)
        if (success) {
          setShowCopySuccess(true)
          setTimeout(() => setShowCopySuccess(false), 3000)
        }
      }
      return
    }

    const shareableUrl = getShareableUrl()
    const message = config.defaultMessage.replace('{{VIDEO_URL}}', shareableUrl)
    
    console.log('Attempting Web Share API with:', { title, message, shareableUrl })
    const result = await shareWithWebAPI(title, message, shareableUrl)
    
    if (!result.success) {
      console.log('Web Share API failed:', result.error)
      // Final fallback - copy to clipboard
      const success = await copyToClipboard(`${message}\n\n${shareableUrl}`)
      if (success) {
        setShowCopySuccess(true)
        setTimeout(() => setShowCopySuccess(false), 3000)
      }
    } else {
      console.log('Web Share API succeeded')
    }
  }

  const handleCopyLink = async () => {
    const shareableUrl = getShareableUrl()
    const success = await copyToClipboard(shareableUrl)
    if (success) {
      setShowCopySuccess(true)
      setTimeout(() => setShowCopySuccess(false), 3000)
    }
    setShowDropdown(false)
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-2 ${className}`}>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <button
        onClick={handleWebShare}
        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        <Share className="w-4 h-4" />
        <span>Share</span>
      </button>
    )
  }

  const enabledPlatforms = Object.entries(config.platforms).filter(([, platform]) => platform.enabled)

  return (
    <div className={`relative ${className} z-10`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
        disabled={!!sharingPlatform}
      >
        <Share className="w-4 h-4" />
        <span>Share</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]">
          {enabledPlatforms.map(([platformKey, platform]) => (
            <button
              key={platformKey}
              onClick={() => handleShare(platformKey as 'whatsapp' | 'facebook' | 'instagram')}
              disabled={sharingPlatform === platformKey}
              className={`
                w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors
                ${sharingPlatform === platformKey ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <img 
                src={platform.icon} 
                alt={`${platformKey} logo`}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling!.textContent = platformKey.charAt(0).toUpperCase()
                }}
              />
              <span className="w-5 h-5 bg-gray-200 rounded text-xs flex items-center justify-center font-semibold text-gray-600" style={{display: 'none'}}></span>
              <span className="text-sm text-gray-700 capitalize flex-1">{platformKey}</span>
              {sharingPlatform === platformKey && (
                <svg className="animate-spin w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </button>
          ))}

          {/* Web Share API option */}
          {canUseWebShareAPI() && (
            <button
              onClick={() => {
                console.log('More options clicked')
                handleWebShare()
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                <Share className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm text-gray-700">More options</span>
            </button>
          )}

          {/* Debug: Always show More options for testing */}
          {!canUseWebShareAPI() && (
            <button
              onClick={() => {
                console.log('More options clicked (Web Share API not available)')
                handleWebShare()
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center">
                <Share className="w-3 h-3 text-gray-600" />
              </div>
              <span className="text-sm text-gray-700">More options (fallback)</span>
            </button>
          )}

          {/* Copy link option */}
          <button
            onClick={handleCopyLink}
            className={`
              w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors
              ${showCopySuccess ? 'bg-green-50' : ''}
            `}
          >
            <div className={`w-5 h-5 rounded flex items-center justify-center ${
              showCopySuccess ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {showCopySuccess ? (
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${showCopySuccess ? 'text-green-700' : 'text-gray-700'}`}>
              {showCopySuccess ? 'Copied!' : 'Copy link'}
            </span>
          </button>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
} 
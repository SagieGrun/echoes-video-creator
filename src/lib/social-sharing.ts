import { SocialSharingConfig } from '@/types/social'

export interface ShareOptions {
  videoUrl: string
  appUrl?: string
  customMessage?: string
}

export interface ShareResult {
  success: boolean
  url?: string
  error?: string
  platform: string
}

// Template variable replacement
export function processMessageTemplate(
  template: string, 
  variables: { VIDEO_URL: string; APP_URL?: string }
): string {
  let message = template
  
  // Replace template variables
  message = message.replace(/\{\{VIDEO_URL\}\}/g, variables.VIDEO_URL)
  
  if (variables.APP_URL) {
    message = message.replace(/\{\{APP_URL\}\}/g, variables.APP_URL)
  }
  
  return message
}

// Platform-specific URL generators
export function generateWhatsAppUrl(message: string): string {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/?text=${encodedMessage}`
}

export function generateFacebookUrl(videoUrl: string, message: string): string {
  const encodedUrl = encodeURIComponent(videoUrl)
  
  // Use the most reliable Facebook sharing method
  // This is the same format used by most major websites
  return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
}

export function generateInstagramUrl(message: string): string {
  // For mobile devices, try to open Instagram app
  if (isMobileDevice()) {
    // Try Instagram app first, with fallback to web
    return 'instagram://story-camera'
  }
  
  // For desktop, we'll return a special URL that our component will handle
  return `instagram-share:${encodeURIComponent(message)}`
}

// Platform detection
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for mobile user agent
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
  
  // Also check for touch capability and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.innerWidth <= 768
  
  console.log('Mobile detection:', { isMobileUA, hasTouch, isSmallScreen, userAgent: navigator.userAgent })
  
  return isMobileUA || (hasTouch && isSmallScreen)
}

export function isInstagramAppAvailable(): boolean {
  if (typeof window === 'undefined') return false
  
  // This is a simplified check - in reality, we can't reliably detect app availability
  return isMobileDevice()
}

// Main sharing function
export async function shareToSocialMedia(
  platform: 'whatsapp' | 'facebook' | 'instagram',
  config: SocialSharingConfig,
  options: ShareOptions
): Promise<ShareResult> {
  try {
    const platformConfig = config.platforms[platform]
    
    if (!platformConfig.enabled) {
      return {
        success: false,
        error: `${platform} sharing is disabled`,
        platform
      }
    }

    // Process message template
    const variables = {
      VIDEO_URL: options.videoUrl,
      APP_URL: options.appUrl
    }
    
    const message = processMessageTemplate(
      options.customMessage || platformConfig.message,
      variables
    )

    let shareUrl: string

    switch (platform) {
      case 'whatsapp':
        shareUrl = generateWhatsAppUrl(message)
        break
      
      case 'facebook':
        shareUrl = generateFacebookUrl(options.videoUrl, message)
        break
      
      case 'instagram':
        shareUrl = generateInstagramUrl(message)
        break
      
      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
          platform
        }
    }

    return {
      success: true,
      url: shareUrl,
      platform
    }

  } catch (error) {
    console.error(`Error sharing to ${platform}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      platform
    }
  }
}

// Web Share API fallback
export function canUseWebShareAPI(): boolean {
  if (typeof window === 'undefined') return false
  return 'share' in navigator
}

export async function shareWithWebAPI(
  title: string,
  text: string,
  url: string
): Promise<ShareResult> {
  try {
    if (!canUseWebShareAPI()) {
      return {
        success: false,
        error: 'Web Share API not supported',
        platform: 'web-share'
      }
    }

    await navigator.share({
      title,
      text,
      url
    })

    return {
      success: true,
      platform: 'web-share'
    }

  } catch (error) {
    // User cancelled sharing or other error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share cancelled',
      platform: 'web-share'
    }
  }
}

// Copy to clipboard fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
} 
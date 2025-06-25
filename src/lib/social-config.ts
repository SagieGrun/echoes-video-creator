import { SocialSharingConfig, DEFAULT_SOCIAL_CONFIG } from '@/types/social'

// In-memory cache for social configuration
let configCache: {
  config: SocialSharingConfig | null
  timestamp: number
  loading: boolean
} = {
  config: null,
  timestamp: 0,
  loading: false
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

export async function getSocialConfig(): Promise<SocialSharingConfig> {
  const now = Date.now()
  
  // Return cached config if it's still valid
  if (configCache.config && (now - configCache.timestamp) < CACHE_DURATION) {
    return configCache.config
  }
  
  // Prevent multiple simultaneous requests
  if (configCache.loading) {
    // Wait for the current request to complete
    while (configCache.loading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    // Return the result of the completed request
    return configCache.config || DEFAULT_SOCIAL_CONFIG
  }
  
  configCache.loading = true
  
  try {
    const response = await fetch('/api/admin/social', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.config) {
      // Update cache
      configCache.config = data.config
      configCache.timestamp = now
      return data.config
    } else {
      throw new Error('Invalid response format')
    }
    
  } catch (error) {
    console.error('Failed to fetch social config:', error)
    
    // Return cached config if available, otherwise default
    if (configCache.config) {
      console.log('Using cached social config due to fetch error')
      return configCache.config
    }
    
    console.log('Using default social config due to fetch error')
    return DEFAULT_SOCIAL_CONFIG
    
  } finally {
    configCache.loading = false
  }
}

// Force refresh the configuration cache
export async function refreshSocialConfig(): Promise<SocialSharingConfig> {
  configCache.timestamp = 0 // Invalidate cache
  return getSocialConfig()
}

// Clear the configuration cache
export function clearSocialConfigCache(): void {
  configCache.config = null
  configCache.timestamp = 0
  configCache.loading = false
}

// Get cached config without making a network request
export function getCachedSocialConfig(): SocialSharingConfig | null {
  const now = Date.now()
  
  if (configCache.config && (now - configCache.timestamp) < CACHE_DURATION) {
    return configCache.config
  }
  
  return null
}

// Preload configuration (useful for performance)
export function preloadSocialConfig(): void {
  // Fire and forget - load config in background
  getSocialConfig().catch(error => {
    console.error('Failed to preload social config:', error)
  })
}

// Check if a specific platform is enabled
export async function isPlatformEnabled(platform: 'whatsapp' | 'facebook' | 'instagram'): Promise<boolean> {
  try {
    const config = await getSocialConfig()
    return config.platforms[platform]?.enabled || false
  } catch (error) {
    console.error('Error checking platform status:', error)
    return DEFAULT_SOCIAL_CONFIG.platforms[platform]?.enabled || false
  }
}

// Get message template for a specific platform
export async function getPlatformMessage(platform: 'whatsapp' | 'facebook' | 'instagram'): Promise<string> {
  try {
    const config = await getSocialConfig()
    return config.platforms[platform]?.message || DEFAULT_SOCIAL_CONFIG.platforms[platform].message
  } catch (error) {
    console.error('Error getting platform message:', error)
    return DEFAULT_SOCIAL_CONFIG.platforms[platform].message
  }
} 
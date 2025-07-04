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
    // Check if we're running on the server or client
    const isServer = typeof window === 'undefined'
    
    if (isServer) {
      // Server-side: Access database directly instead of making HTTP calls
      const { supabaseServiceRole } = await import('@/lib/supabase-server')
      
      const { data: configs, error } = await supabaseServiceRole
        .from('admin_config')
        .select('key, value')
        .eq('key', 'social_sharing')
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`)
      }
      
      const socialConfig = configs?.value || DEFAULT_SOCIAL_CONFIG
      
      // Update cache
      configCache.config = socialConfig
      configCache.timestamp = now
      return socialConfig
      
    } else {
      // Client-side: Use fetch as before
      const response = await fetch('/api/social-config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.socialConfig) {
        // Update cache
        configCache.config = data.socialConfig
        configCache.timestamp = now
        return data.socialConfig
      } else {
        throw new Error('Invalid response format')
      }
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
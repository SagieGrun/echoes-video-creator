export interface SocialPlatform {
  enabled: boolean
  message: string
  icon: string // Path to logo image
}

export interface SocialSharingConfig {
  platforms: {
    whatsapp: SocialPlatform
    facebook: SocialPlatform
    instagram: SocialPlatform
  }
  defaultMessage: string
  includeAppUrl: boolean
  trackSharing: boolean
  updated_at?: string
}

export const DEFAULT_SOCIAL_CONFIG: SocialSharingConfig = {
  platforms: {
    whatsapp: {
      enabled: true,
      message: "🎬 Check out my amazing animated video created with Echoes! {{VIDEO_URL}}",
      icon: "/logos/whatsapp.png"
    },
    facebook: {
      enabled: true, 
      message: "✨ Brought my memories to life with AI! {{VIDEO_URL}} #Echoes #AnimatedMemories",
      icon: "/logos/facebook.png"
    },
    instagram: {
      enabled: true,
      message: "🎥 My photos came alive! Created with Echoes ✨ {{VIDEO_URL}}",
      icon: "/logos/instagram.png"
    }
  },
  defaultMessage: "🎬 Check out my amazing animated video created with Echoes! {{VIDEO_URL}}",
  includeAppUrl: true,
  trackSharing: false
} 
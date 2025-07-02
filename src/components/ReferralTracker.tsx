'use client'

import { useEffect } from 'react'

export default function ReferralTracker() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Check for referral parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')
    
    if (refCode) {
      console.log('🔗 Referral code detected:', refCode)
      
      // Set referral cookie for 365 days with production-safe settings
      const expiryDate = new Date()
      expiryDate.setTime(expiryDate.getTime() + (365 * 24 * 60 * 60 * 1000))
      
      // Production-safe cookie settings for OAuth compatibility
      const isProduction = window.location.protocol === 'https:'
      const cookieString = isProduction 
        ? `referral_code=${refCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=None; Secure`
        : `referral_code=${refCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
      
      document.cookie = cookieString
      
      console.log('✅ Referral cookie set for 365 days', isProduction ? '(Production: Secure, SameSite=None)' : '(Development: SameSite=Lax)')
      
      // Clean URL to remove the ref parameter (optional, for cleaner URLs)
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('ref')
      window.history.replaceState({}, '', cleanUrl.toString())
      
      console.log('🧹 URL cleaned, ref parameter removed')
    }
  }, [])

  // This component renders nothing, it just handles the referral tracking
  return null
} 
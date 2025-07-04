'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export function useSmartLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSmartLogin = async () => {
    setIsLoading(true)
    
    try {
      const supabase = createSupabaseBrowserClient()
      
      // Check if user has a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session check error:', sessionError)
        // If there's an error, try OAuth login
        await triggerOAuthLogin(supabase)
        return
      }

      if (session?.user) {
        // User has valid token - check clip history and route appropriately
        const destination = await determineUserDestination(session.user.id, supabase)
        router.push(destination)
      } else {
        // No valid token - trigger OAuth login
        await triggerOAuthLogin(supabase)
      }
    } catch (error) {
      console.error('Smart login error:', error)
      // Fallback to OAuth login
      const supabase = createSupabaseBrowserClient()
      await triggerOAuthLogin(supabase)
    } finally {
      setIsLoading(false)
    }
  }

  const triggerOAuthLogin = async (supabase: any) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      console.error('OAuth login error:', error)
      // Fallback to login page
      router.push('/login')
    }
  }

  const determineUserDestination = async (userId: string, supabase: any): Promise<string> => {
    try {
      // Always route to dashboard now - Create tab is within dashboard
      return '/dashboard'
    } catch (error) {
      console.error('Error determining destination:', error)
      return '/dashboard' // Default fallback
    }
  }

  return {
    handleSmartLogin,
    isLoading
  }
} 
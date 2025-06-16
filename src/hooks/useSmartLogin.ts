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
      // Get user's projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)

      if (projectsError || !projects || projects.length === 0) {
        // No projects = new user, send to create page
        return '/create'
      }

      // Get completed clips for these projects
      const projectIds = projects.map((p: any) => p.id)
      const { data: completedClips, error: clipsError } = await supabase
        .from('clips')
        .select('id')
        .in('project_id', projectIds)
        .eq('status', 'completed')
        .not('video_url', 'is', null)

      if (clipsError) {
        console.error('Error checking clips:', clipsError)
        // Default to create page if there's an error
        return '/create'
      }

      // Route based on clip history
      if (completedClips && completedClips.length > 0) {
        return '/dashboard'  // Has completed clips
      } else {
        return '/create'     // No completed clips yet
      }
    } catch (error) {
      console.error('Error determining destination:', error)
      return '/create' // Default fallback
    }
  }

  return {
    handleSmartLogin,
    isLoading
  }
} 
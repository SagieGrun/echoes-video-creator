'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export function useCreditBalance(userId: string | null) {
  const [credits, setCredits] = useState<number>(0)
  const [previousCredits, setPreviousCredits] = useState<number>(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Use refs to avoid stale closures
  const creditsRef = useRef<number>(0)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    
    const supabase = createSupabaseBrowserClient()
    
    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }
    
    // Initial fetch
    const fetchCredits = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('credit_balance')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.error('Error fetching credit balance:', error)
          return
        }
        
        if (data) {
          const newBalance = data.credit_balance
          
          // Update refs immediately
          creditsRef.current = newBalance
          
          // Set state
          setCredits(newBalance)
          setPreviousCredits(0) // Initial load, no previous credits
        }
      } catch (error) {
        console.error('Error in fetchCredits:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Set up real-time subscription for credit updates (ONLY system for updates)
    const subscription = supabase
      .channel(`user-credits-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      }, (payload: any) => {
        console.log('Credit balance updated via real-time:', payload)
        
        const newBalance = payload.new.credit_balance
        const oldBalance = payload.old?.credit_balance || creditsRef.current
        
        // Only show animation if credits actually increased and we're not loading
        if (newBalance > oldBalance && !isLoading) {
          console.log(`Credits increased: ${oldBalance} → ${newBalance}`)
          
          // Clear any existing animation timeout
          if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current)
          }
          
          // Update state
          setPreviousCredits(oldBalance)
          setCredits(newBalance)
          creditsRef.current = newBalance
          
          // Show animation
          setShowAnimation(true)
          animationTimeoutRef.current = setTimeout(() => {
            setShowAnimation(false)
            animationTimeoutRef.current = null
          }, 3000)
        } else {
          // Just update credits without animation
          setCredits(newBalance)
          creditsRef.current = newBalance
        }
      })
      .subscribe((status: any) => {
        console.log('Real-time subscription status:', status)
      })

    fetchCredits()
    
    return () => {
      console.log('Cleaning up credit balance subscription')
      subscription.unsubscribe()
      
      // Clear animation timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
    }
  }, [userId, isLoading])
  
  return { 
    credits, 
    previousCredits, 
    showAnimation, 
    isLoading,
    creditsAdded: showAnimation ? credits - previousCredits : 0
  }
} 
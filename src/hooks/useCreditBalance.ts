'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export function useCreditBalance(userId: string | null) {
  const [credits, setCredits] = useState<number>(0)
  const [previousCredits, setPreviousCredits] = useState<number>(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    
    const supabase = createSupabaseBrowserClient()
    
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
          setPreviousCredits(credits)
          setCredits(newBalance)
          
          // Show animation if credits increased (and not initial load)
          if (newBalance > credits && !isLoading) {
            setShowAnimation(true)
            setTimeout(() => setShowAnimation(false), 3000)
          }
        }
      } catch (error) {
        console.error('Error in fetchCredits:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Set up real-time subscription for credit updates
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
        const oldBalance = payload.old?.credit_balance || credits
        
        setPreviousCredits(oldBalance)
        setCredits(newBalance)
        
        // Show animation if credits increased
        if (newBalance > oldBalance) {
          setShowAnimation(true)
          setTimeout(() => setShowAnimation(false), 3000)
        }
      })
      .subscribe((status: any) => {
        console.log('Real-time subscription status:', status)
      })

    // Also poll for credit updates every 5 seconds as a fallback
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('credit_balance')
          .eq('id', userId)
          .single()
        
        if (data && data.credit_balance !== credits) {
          console.log('Credit balance updated via polling:', data.credit_balance)
          setPreviousCredits(credits)
          setCredits(data.credit_balance)
          
          // Show animation if credits increased
          if (data.credit_balance > credits) {
            setShowAnimation(true)
            setTimeout(() => setShowAnimation(false), 3000)
          }
        }
      } catch (error) {
        console.error('Error polling credit balance:', error)
      }
    }, 5000)
    
    fetchCredits()
    
    return () => {
      console.log('Cleaning up credit balance subscription')
      subscription.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [userId])
  
  return { 
    credits, 
    previousCredits, 
    showAnimation, 
    isLoading,
    creditsAdded: showAnimation ? credits - previousCredits : 0
  }
} 
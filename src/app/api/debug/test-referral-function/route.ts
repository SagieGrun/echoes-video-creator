import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Test the referral function with dummy data
    const testUserId = 'test-user-' + Date.now()
    const testReferralCode = 'c1641393' // The code from your logs
    
    console.log('🧪 Testing referral function with:', { testUserId, testReferralCode })
    
    const { data, error } = await supabase.rpc('process_referral_signup', {
      new_user_id: testUserId,
      referrer_code: testReferralCode
    })
    
    console.log('🧪 Referral function result:', { data, error })
    
    // Also check if the referrer exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('users')
      .select('id, referral_code, credits')
      .eq('referral_code', testReferralCode)
      .single()
    
    console.log('🧪 Referrer lookup:', { referrerData, referrerError })
    
    // Check current referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      success: true,
      test: {
        testUserId,
        testReferralCode,
        functionResult: { data, error: error?.message },
        referrerData: { data: referrerData, error: referrerError?.message },
        recentReferrals: { data: referrals, error: referralsError?.message }
      }
    })
    
  } catch (error) {
    console.error('Referral function test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 
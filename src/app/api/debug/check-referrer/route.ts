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
    
    const testReferralCode = 'c1641393'
    
    // Check if referrer user exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('users')
      .select('id, email, referral_code, credit_balance, created_at')
      .eq('referral_code', testReferralCode)
      .single()
    
    console.log('🔍 Referrer lookup:', { referrerData, referrerError })
    
    // Also check all users to see if anyone has this referral code
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, referral_code, credit_balance')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Check current referrals table
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    return NextResponse.json({
      success: true,
      referralCode: testReferralCode,
      referrer: {
        data: referrerData,
        error: referrerError?.message
      },
      recentUsers: {
        data: allUsers,
        error: allUsersError?.message
      },
      recentReferrals: {
        data: referrals,
        error: referralsError?.message
      }
    })
    
  } catch (error) {
    console.error('Referrer check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 
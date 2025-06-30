import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  try {
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔥 Auth test:', { user: user?.id, authError })
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Auth failed', authError }, { status: 401 })
    }

    // Test user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('referral_code, credit_balance, created_at')
      .eq('id', user.id)
      .single()
    
    console.log('🔥 User data test:', { userData, userError })

    // Test PLG settings
    const { data: plgSettings, error: plgError } = await supabase
      .from('admin_config')
      .select('key, value')
      .in('key', ['plg_referral_reward', 'plg_share_reward'])
    
    console.log('🔥 PLG settings test:', { plgSettings, plgError })

    // Test share_submissions table
    const { data: shareSubmission, error: shareError } = await supabase
      .from('share_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()
    
    console.log('🔥 Share submissions test:', { shareSubmission, shareError })

    // Test referrals table
    const { data: referralStats, error: referralError } = await supabase
      .from('referrals')
      .select('id, reward_granted')
      .eq('referrer_id', user.id)
    
    console.log('🔥 Referrals test:', { referralStats, referralError })

    return NextResponse.json({
      success: true,
      user: user.id,
      userData,
      plgSettings,
      shareSubmission,
      referralStats,
      errors: {
        authError,
        userError,
        plgError,
        shareError,
        referralError
      }
    })
    
  } catch (error) {
    console.error('🔥 Debug endpoint error:', error)
    return NextResponse.json({ error: 'Debug failed', details: error }, { status: 500 })
  }
} 
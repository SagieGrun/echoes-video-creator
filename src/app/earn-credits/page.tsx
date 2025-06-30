import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import EarnCreditsClient from '@/components/credits/EarnCreditsClient'

export const metadata = {
  title: 'Earn Free Credits - Echoes Video Creator',
  description: 'Get free credits by referring friends and sharing on social media',
}

export default async function EarnCreditsPage() {
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
    console.log('🔥 EARN CREDITS: Starting page load')
    
    // Check authentication
    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('🔥 EARN CREDITS: Auth check:', { userId: user?.id, authError: error })
    
    if (error || !user) {
      console.log('🔥 EARN CREDITS: Auth failed, redirecting to login')
      redirect('/login?redirect=/earn-credits')
    }

    // Get user data with referral code
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('referral_code, credit_balance, created_at')
      .eq('id', user.id)
      .single()

    console.log('🔥 EARN CREDITS: User data query:', { userData, userError })

    if (userError || !userData) {
      console.error('🔥 EARN CREDITS: User data error, redirecting to dashboard:', userError)
      redirect('/dashboard')
    }

    // Get PLG settings from admin config
    const { data: plgSettings, error: plgError } = await supabase
      .from('admin_config')
      .select('key, value')
      .in('key', ['plg_referral_reward', 'plg_share_reward'])

    console.log('🔥 EARN CREDITS: PLG settings query:', { plgSettings, plgError })

    const referralReward = plgSettings?.find((s: any) => s.key === 'plg_referral_reward')?.value || 5
    const shareReward = plgSettings?.find((s: any) => s.key === 'plg_share_reward')?.value || 2

    // Check if user has already earned share reward
    const { data: shareSubmission, error: shareError } = await supabase
      .from('share_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    console.log('🔥 EARN CREDITS: Share submission query:', { shareSubmission, shareError })

    const hasEarnedShareReward = !!shareSubmission

    // Get referral statistics
    const { data: referralStats, error: referralError } = await supabase
      .from('referrals')
      .select('id, reward_granted')
      .eq('referrer_id', user.id)

    console.log('🔥 EARN CREDITS: Referral stats query:', { referralStats, referralError })

    const totalReferrals = referralStats?.length || 0
    const rewardedReferrals = referralStats?.filter(r => r.reward_granted).length || 0
    const pendingReferrals = totalReferrals - rewardedReferrals

    console.log('🔥 EARN CREDITS: Success! Rendering page')

    return (
      <EarnCreditsClient
        user={{
          id: user.id,
          email: user.email!,
          referralCode: userData.referral_code,
          credits: userData.credit_balance,
          createdAt: userData.created_at
        }}
        rewards={{
          referral: referralReward,
          share: shareReward
        }}
        stats={{
          totalReferrals,
          rewardedReferrals,
          pendingReferrals,
          hasEarnedShareReward
        }}
      />
    )
  } catch (error) {
    console.error('🔥 EARN CREDITS: Unexpected error:', error)
    redirect('/dashboard')
  }
} 
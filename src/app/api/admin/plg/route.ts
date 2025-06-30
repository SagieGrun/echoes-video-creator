import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { DEFAULT_SOCIAL_CONFIG, SocialSharingConfig } from '@/types/social'

export async function GET() {
  try {
    // Get both social sharing and PLG configurations
    const { data: configs, error } = await supabaseServiceRole
      .from('admin_config')
      .select('key, value')
      .in('key', ['social_sharing', 'plg_settings'])

    if (error) {
      console.error('Error fetching PLG configs:', error)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }

    // Extract configurations
    const socialConfig = configs?.find(c => c.key === 'social_sharing')?.value || DEFAULT_SOCIAL_CONFIG
    const plgSettings = configs?.find(c => c.key === 'plg_settings')?.value || {
      referral_reward_credits: 5,
      share_reward_credits: 2
    }

    // Get PLG statistics
    const stats = await getPLGStatistics()

    return NextResponse.json({ 
      socialConfig,
      plgSettings,
      stats
    })
  } catch (error) {
    console.error('Error in PLG config GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { socialConfig, plgSettings } = await request.json()

    const updates = []

    // Update social config if provided
    if (socialConfig) {
      const configWithTimestamp = {
        ...socialConfig,
        updated_at: new Date().toISOString()
      }
      updates.push({
        key: 'social_sharing',
        value: configWithTimestamp
      })
    }

    // Update PLG settings if provided
    if (plgSettings) {
      updates.push({
        key: 'plg_settings',
        value: plgSettings
      })
    }

    if (updates.length > 0) {
      const { error } = await supabaseServiceRole
        .from('admin_config')
        .upsert(updates)

      if (error) {
        console.error('Error saving PLG configs:', error)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'PLG configuration updated successfully'
    })
  } catch (error) {
    console.error('Error in PLG config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getPLGStatistics() {
  try {
    // Get simple referral statistics
    const { data: referralStats, error: referralError } = await supabaseServiceRole
      .from('referrals')
      .select('id, referrer_id, reward_granted, created_at')

    if (referralError) {
      console.error('Error fetching referral stats:', referralError)
    }

    // Get simple share submission statistics
    const { data: shareStats, error: shareError } = await supabaseServiceRole
      .from('share_submissions')
      .select('id, status, created_at')

    if (shareError) {
      console.error('Error fetching share stats:', shareError)
    }

    // Get credit transaction statistics for PLG
    const { data: creditStats, error: creditError } = await supabaseServiceRole
      .from('credit_transactions')
      .select('amount, type, created_at')
      .in('type', ['referral', 'referral_bonus', 'share'])

    if (creditError) {
      console.error('Error fetching credit stats:', creditError)
    }

    // Calculate simple statistics
    const totalReferrals = referralStats?.length || 0
    const rewardedReferrals = referralStats?.filter(r => r.reward_granted).length || 0
    const totalShares = shareStats?.length || 0
    const approvedShares = shareStats?.filter(s => s.status === 'approved').length || 0
    const totalCreditsAwarded = creditStats?.reduce((sum, t) => sum + t.amount, 0) || 0

    // Get top referrers
    const referralCounts = referralStats?.reduce((acc: Record<string, number>, ref) => {
      if (ref.reward_granted) {
        acc[ref.referrer_id] = (acc[ref.referrer_id] || 0) + 1
      }
      return acc
    }, {}) || {}

    const topReferrers = Object.entries(referralCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, referralCount: count }))

    return {
      totalReferrals,
      rewardedReferrals,
      totalShares,
      approvedShares,
      totalCreditsAwarded,
      topReferrers,
      thisMonth: {
        referrals: referralStats?.filter(r => 
          new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length || 0,
        shares: shareStats?.filter(s => 
          new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length || 0
      }
    }
  } catch (error) {
    console.error('Error calculating PLG statistics:', error)
    return {
      totalReferrals: 0,
      rewardedReferrals: 0,
      totalShares: 0,
      approvedShares: 0,
      totalCreditsAwarded: 0,
      topReferrers: [],
      thisMonth: { referrals: 0, shares: 0 }
    }
  }
} 
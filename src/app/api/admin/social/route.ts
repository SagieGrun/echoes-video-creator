import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { DEFAULT_SOCIAL_CONFIG, SocialSharingConfig } from '@/types/social'

export async function GET() {
  try {
    // Get the social sharing configuration
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'social_sharing')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching social config:', error)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }

    // Return the configuration or default if not found
    const config: SocialSharingConfig = data?.value || DEFAULT_SOCIAL_CONFIG

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error in social config GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { config }: { config: SocialSharingConfig } = await request.json()

    if (!config) {
      return NextResponse.json({ error: 'Configuration is required' }, { status: 400 })
    }

    // Add timestamp
    const configWithTimestamp = {
      ...config,
      updated_at: new Date().toISOString()
    }

    // Upsert the configuration
    const { error } = await supabase
      .from('admin_config')
      .upsert({
        key: 'social_sharing',
        value: configWithTimestamp
      })

    if (error) {
      console.error('Error saving social config:', error)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Social sharing configuration updated successfully',
      config: configWithTimestamp 
    })
  } catch (error) {
    console.error('Error in social config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
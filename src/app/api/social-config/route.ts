import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { DEFAULT_SOCIAL_CONFIG } from '@/types/social'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'social_sharing')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const socialConfig = data?.value || DEFAULT_SOCIAL_CONFIG
    
    return NextResponse.json({ socialConfig })
  } catch (error) {
    console.error('Error fetching social config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social configuration' },
      { status: 500 }
    )
  }
} 
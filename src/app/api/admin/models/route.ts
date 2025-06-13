import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEFAULT_MODEL_CONFIG = {
  activeProvider: 'runway',
  providers: {
    runway: {
      name: 'Runway ML',
      status: 'active',
      config: {
        model: 'gen3',
        resolution: '1280x768',
        duration: 5,
      }
    }
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'model_config')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const config = data?.value || DEFAULT_MODEL_CONFIG
    
    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching model config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model config' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { activeProvider, providers } = await request.json()
    
    if (!activeProvider || !providers) {
      return NextResponse.json(
        { error: 'Active provider and providers config are required' },
        { status: 400 }
      )
    }

    const config = {
      activeProvider,
      providers,
    }

    // Update the config
    const { error } = await supabase
      .from('admin_config')
      .upsert({
        key: 'model_config',
        value: config,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error updating model config:', error)
    return NextResponse.json(
      { error: 'Failed to update model config' },
      { status: 500 }
    )
  }
} 
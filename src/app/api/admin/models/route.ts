import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

const DEFAULT_MODEL_CONFIG = {
  activeProvider: 'runway',
  providers: {
    runway: {
      name: 'Runway ML',
      status: 'active',
      config: {
        model: 'gen4_turbo',
        duration: 5,
      }
    },
    kling: {
      name: 'Kling V2',
      status: 'inactive',
      config: {
        modelId: 'klingai/v2-master-image-to-video',
        duration: 5,
      }
    }
  }
}

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { data, error } = await supabaseServiceRole
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
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

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

    console.log('Saving model configuration:', {
      activeProvider,
      providerNames: Object.keys(providers),
      activeProviderConfig: providers[activeProvider]?.config
    })

    // Update the config
    const { error } = await supabaseServiceRole
      .from('admin_config')
      .upsert({
        key: 'model_config',
        value: config,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    console.log('Model configuration saved successfully')
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error updating model config:', error)
    return NextResponse.json(
      { error: 'Failed to update model config' },
      { status: 500 }
    )
  }
} 
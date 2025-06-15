import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ModelConfig {
  activeProvider: string
  providers: {
    [key: string]: {
      name: string
      status: string
      config: {
        model: string
        resolution: string
        duration: number
      }
    }
  }
}

interface UpdateModelConfigRequest {
  activeProvider: string
  providers: ModelConfig['providers']
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
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

function createServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

Deno.serve(async (req) => {
  const requestId = Math.random().toString(36).substring(2, 15)
  
  console.log(`[ADMIN-MODELS-${requestId}] === ADMIN MODELS START ===`, {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }

  try {
    const serviceSupabase = createServiceSupabaseClient()

    if (req.method === 'GET') {
      console.log(`[ADMIN-MODELS-${requestId}] Step 1: Fetching model configuration`)
      
      const { data, error } = await serviceSupabase
        .from('admin_config')
        .select('value')
        .eq('key', 'model_config')
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error(`[ADMIN-MODELS-${requestId}] Database error:`, error)
        throw error
      }

      const config = data?.value || DEFAULT_MODEL_CONFIG
      
      console.log(`[ADMIN-MODELS-${requestId}] Returning model configuration`, {
        activeProvider: config.activeProvider,
        providerCount: Object.keys(config.providers).length
      })
      
      return new Response(
        JSON.stringify({ config }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    if (req.method === 'POST') {
      console.log(`[ADMIN-MODELS-${requestId}] Step 1: Updating model configuration`)
      const body: UpdateModelConfigRequest = await req.json()
      const { activeProvider, providers } = body
      
      if (!activeProvider || !providers) {
        console.log(`[ADMIN-MODELS-${requestId}] Missing required fields`)
        return new Response(
          JSON.stringify({ error: 'Active provider and providers config are required' }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      }

      const config: ModelConfig = {
        activeProvider,
        providers,
      }

      // Update the config
      const { error } = await serviceSupabase
        .from('admin_config')
        .upsert({
          key: 'model_config',
          value: config,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error(`[ADMIN-MODELS-${requestId}] Failed to save model config:`, error)
        throw error
      }

      console.log(`[ADMIN-MODELS-${requestId}] Model configuration updated successfully`, {
        activeProvider: config.activeProvider,
        providerCount: Object.keys(config.providers).length
      })
      
      return new Response(
        JSON.stringify({ success: true, config }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

  } catch (error) {
    console.error(`[ADMIN-MODELS-${requestId}] Error in admin models:`, error)
    return new Response(
      JSON.stringify({ error: 'Failed to manage model configuration' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}) 
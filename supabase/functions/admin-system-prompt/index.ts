import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UpdatePromptRequest {
  prompt: string
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant that helps create cinematic, emotional video clips from static photos. 

When generating video clips:
- Focus on subtle, natural movements that bring the photo to life
- Add gentle camera movements like slow pans or zooms
- Create atmospheric effects like light changes or environmental movement
- Maintain the emotional tone and story of the original photo
- Keep movements realistic and not overly dramatic
- Ensure the clip feels cinematic and professional

The goal is to transform static memories into living, breathing moments that evoke emotion and nostalgia.`

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
  
  console.log(`[ADMIN-PROMPT-${requestId}] === ADMIN SYSTEM PROMPT START ===`, {
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
      console.log(`[ADMIN-PROMPT-${requestId}] Step 1: Fetching system prompt`)
      
      const { data, error } = await serviceSupabase
        .from('admin_config')
        .select('value, updated_at')
        .eq('key', 'system_prompt')
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error(`[ADMIN-PROMPT-${requestId}] Database error:`, error)
        throw error
      }

      const systemPrompt = data 
        ? { prompt: data.value.prompt, updated_at: data.updated_at }
        : { prompt: DEFAULT_SYSTEM_PROMPT, updated_at: '' }
      
      console.log(`[ADMIN-PROMPT-${requestId}] Returning system prompt`, {
        hasCustomPrompt: !!data,
        promptLength: systemPrompt.prompt.length
      })
      
      return new Response(
        JSON.stringify({ systemPrompt }),
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
      console.log(`[ADMIN-PROMPT-${requestId}] Step 1: Updating system prompt`)
      const body: UpdatePromptRequest = await req.json()
      const { prompt } = body
      
      if (!prompt || !prompt.trim()) {
        console.log(`[ADMIN-PROMPT-${requestId}] Missing or empty prompt`)
        return new Response(
          JSON.stringify({ error: 'Prompt is required' }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      }

      const now = new Date().toISOString()

      // Update the system prompt
      const { error } = await serviceSupabase
        .from('admin_config')
        .upsert({
          key: 'system_prompt',
          value: { prompt: prompt.trim() },
          updated_at: now,
        })

      if (error) {
        console.error(`[ADMIN-PROMPT-${requestId}] Failed to save system prompt:`, error)
        throw error
      }

      const systemPrompt = {
        prompt: prompt.trim(),
        updated_at: now
      }

      console.log(`[ADMIN-PROMPT-${requestId}] System prompt updated successfully`, {
        promptLength: systemPrompt.prompt.length
      })
      
      return new Response(
        JSON.stringify({ success: true, systemPrompt }),
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
    console.error(`[ADMIN-PROMPT-${requestId}] Error in admin system prompt:`, error)
    return new Response(
      JSON.stringify({ error: 'Failed to manage system prompt' }),
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
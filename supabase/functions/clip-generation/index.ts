// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createRunwayService } from '../_shared/runway.ts'
import { createKlingService } from '../_shared/kling.ts'
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, createServiceSupabaseClient } from '../_shared/auth.ts'

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

interface GenerateClipRequest {
  image_url: string
  image_file_path: string
  project_id?: string
}

console.log("Hello from Functions!")

/**
 * Get active video generation provider from admin configuration
 */
async function getActiveProvider() {
  try {
    const serviceSupabase = createServiceSupabaseClient()
    const { data, error } = await serviceSupabase
      .from('admin_config')
      .select('value')
      .eq('key', 'model_config')
      .single()

    if (error || !data?.value) {
      console.warn('No model configuration found, defaulting to Runway')
      return { provider: 'runway', config: { duration: 5 } }
    }

    const config = data.value
    const activeProvider = config.activeProvider || 'runway'
    const providerConfig = config.providers?.[activeProvider]?.config || { duration: 5 }

    console.log('Loaded provider configuration:', {
      activeProvider,
      providerName: config.providers?.[activeProvider]?.name,
      config: providerConfig
    })

    return { provider: activeProvider, config: providerConfig }
  } catch (error) {
    console.error('Error loading provider configuration:', error)
    return { provider: 'runway', config: { duration: 5 } }
  }
}

/**
 * Create video generation service based on provider
 */
function createVideoService(provider: string) {
  switch (provider) {
    case 'kling':
      return createKlingService()
    case 'runway':
    default:
      return createRunwayService()
  }
}

Deno.serve(async (req) => {
  const requestId = Math.random().toString(36).substring(2, 15)
  const startTime = Date.now()
  
  console.log(`[API-${requestId}] === GENERATE REQUEST START ===`, {
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
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
    // Get and validate user authentication
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      console.error(`[API-${requestId}] Authentication failed`)
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`[API-${requestId}] Step 1: User authenticated:`, { 
      userId: authUser.id,
      email: authUser.email 
    })

    // Get the authorization token for authenticated requests
    const authToken = req.headers.get('Authorization')?.substring(7) // Remove 'Bearer ' prefix
    if (!authToken) {
      throw new Error('No auth token found')
    }

    const authenticatedSupabase = createAuthenticatedSupabaseClient(authToken)
    console.log(`[API-${requestId}] Step 2: User profile loaded:`, { 
      creditBalance: authUser.credit_balance,
      userId: authUser.id 
    })

    // Check if user has enough credits
    if (authUser.credit_balance < 1) {
      console.log(`[API-${requestId}] Insufficient credits:`, { 
        creditBalance: authUser.credit_balance 
      })
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { 
          status: 402,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Parse request body
    const body: GenerateClipRequest = await req.json()
    const { image_url, image_file_path, project_id } = body

    if (!image_url || !image_file_path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image_url, image_file_path' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`[API-${requestId}] Step 3: Request validated:`, {
      hasImageUrl: !!image_url,
      hasImageFilePath: !!image_file_path,
      hasProjectId: !!project_id,
      imageUrl: image_url.substring(0, 100) + '...',
      imageFilePath: image_file_path
    })

    // Handle project creation/retrieval
    let finalProjectId = project_id
    
    if (!finalProjectId) {
      console.log(`[API-${requestId}] Step 4a: Creating new project`)
      const serviceSupabase = createServiceSupabaseClient()
      const { data: newProject, error: projectError } = await serviceSupabase
        .from('projects')
        .insert({
          user_id: authUser.id,
          title: 'Untitled Project',
          status: 'in_progress'
        })
        .select()
        .single()

      if (projectError || !newProject) {
        console.error(`[API-${requestId}] Error creating project:`, projectError)
        return new Response(
          JSON.stringify({ error: 'Failed to create project' }),
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      }

      finalProjectId = newProject.id
      console.log(`[API-${requestId}] New project created:`, { projectId: finalProjectId })
    } else {
      console.log(`[API-${requestId}] Step 4b: Using existing project:`, { projectId: finalProjectId })
    }

    // Get system prompt
    const serviceSupabase = createServiceSupabaseClient()
    const { data: systemPromptData, error: promptError } = await serviceSupabase
      .from('admin_config')
      .select('value')
      .eq('key', 'system_prompt')
      .single()

    const systemPrompt = systemPromptData?.value?.prompt || 'Create a beautiful, cinematic animated clip from this photo. Add subtle movement and depth while maintaining the original character and mood of the image.'

    console.log(`[API-${requestId}] Step 5: System prompt loaded:`, {
      promptLength: systemPrompt.length,
      promptPreview: systemPrompt.substring(0, 100) + '...'
    })

    // Create clip record first
    const { data: clip, error: clipError } = await serviceSupabase
      .from('clips')
      .insert({
        project_id: finalProjectId,
        image_url: image_url,
        image_file_path: image_file_path,
        status: 'pending',
        clip_order: 1,
        approved: false,
        prompt: systemPrompt
      })
      .select()
      .single()

    if (clipError || !clip) {
      console.error(`[API-${requestId}] Error creating clip:`, clipError)
      return new Response(
        JSON.stringify({ error: 'Failed to create clip record' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`[API-${requestId}] Clip record created:`, { clipId: clip.id })

    // Get active provider configuration
    const { provider, config } = await getActiveProvider()
    
    // Start video generation with appropriate service
    try {
      console.log(`[API-${requestId}] Step 6: Starting ${provider} generation`)
      console.log(`[API-${requestId}] Using signed URL directly:`, {
        signedUrl: image_url.substring(0, 100) + '...',
        provider,
        config
      })
      
      const videoService = createVideoService(provider)
      const result = await videoService.generateVideo({
        image_url: image_url, // Use the signed URL directly
        prompt: systemPrompt,
        duration: config.duration || 5
      })

      if (result.status === 'failed') {
        return new Response(
          JSON.stringify({ error: result.error_message || 'Failed to start generation' }),
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      }

      // Update clip with generation task ID and set status to processing
      const { error: updateError } = await serviceSupabase
        .from('clips')
        .update({
          generation_job_id: result.task_id,
          status: 'processing'
        })
        .eq('id', clip.id)

      if (updateError) {
        console.error('Error updating clip with job ID:', updateError)
        // Continue anyway, we can still track the job
      }

      // Deduct 1 credit from user
      const { error: creditError } = await authenticatedSupabase
        .from('users')
        .update({ 
          credit_balance: authUser.credit_balance - 1 
        })
        .eq('id', authUser.id)

      if (creditError) {
        console.error('Error deducting credit:', creditError)
      }

      // Log the credit transaction
      await serviceSupabase
        .from('credit_transactions')
        .insert({
          user_id: authUser.id,
          amount: -1,
          type: 'generation',
          reference_id: clip.id
        })

      console.log(`[API-${requestId}] Generation started successfully with ${provider}`)

      // Return success response
      const totalDuration = Date.now() - startTime
      console.log(`[API-${requestId}] === GENERATE REQUEST SUCCESS ===`, {
        totalDuration_ms: totalDuration,
        provider,
        timestamp: new Date().toISOString()
      })

      const responsePayload = {
        clipId: clip.id, // Changed from clip_id to match frontend expectation
        project_id: finalProjectId,
        status: 'processing',
        credits_remaining: authUser.credit_balance - 1,
        estimated_time: result.estimated_time || 25, // seconds
        provider: provider // Include provider info for debugging
      }

      console.log(`[API-${requestId}] SENDING RESPONSE:`, {
        payload: responsePayload,
        timestamp: new Date().toISOString()
      })

      return new Response(
        JSON.stringify(responsePayload),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )

    } catch (generationError) {
      console.error(`[API-${requestId}] Error starting video generation:`, generationError)
      
      // Update clip status to failed
      await serviceSupabase
        .from('clips')
        .update({
          status: 'failed',
          error_message: generationError instanceof Error ? generationError.message : 'Unknown error'
        })
        .eq('id', clip.id)

      return new Response(
        JSON.stringify({ error: 'Failed to start video generation' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

  } catch (error) {
    console.error(`[API-${requestId}] Unexpected error:`, error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/clip-generation' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

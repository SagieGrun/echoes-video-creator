// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createRunwayService } from '../_shared/runway.ts'
import { getAuthenticatedUser, createAuthenticatedSupabaseClient, createServiceSupabaseClient } from '../_shared/auth.ts'

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

interface GenerateClipRequest {
  image_url: string
  project_id?: string
}

async function getSystemPrompt(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient()
    
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'system_prompt')
      .single()

    if (error || !data) {
      console.log('Using default system prompt, config not found:', error)
      return 'Create a beautiful animated clip from this photo with subtle, natural movements that bring the image to life.'
    }

    return data.value.prompt || 'Create a beautiful animated clip from this photo with subtle, natural movements that bring the image to life.'
  } catch (error) {
    console.error('Error fetching system prompt:', error)
    return 'Create a beautiful animated clip from this photo with subtle, natural movements that bring the image to life.'
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
    // Check authentication
    console.log(`[API-${requestId}] Step 1: Checking authentication`)
    const user = await getAuthenticatedUser(req)
    if (!user) {
      console.log(`[API-${requestId}] Authentication failed - no user`)
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
    
    console.log(`[API-${requestId}] User authenticated:`, { 
      userId: user.id, 
      email: user.email 
    })

    // Parse request body
    console.log(`[API-${requestId}] Step 2: Parsing request body`)
    const body: GenerateClipRequest = await req.json()
    const { image_url, project_id } = body
    
    console.log(`[API-${requestId}] Request parameters:`, {
      hasImageUrl: !!image_url,
      imageUrlLength: image_url?.length || 0,
      imageUrlPrefix: image_url ? image_url.substring(0, 50) + '...' : 'none',
      hasProjectId: !!project_id,
      projectId: project_id
    })
    
    if (!image_url) {
      console.error(`[API-${requestId}] Missing image_url parameter`)
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Check user's credit balance
    console.log(`[API-${requestId}] Step 3: Checking user credit balance`)
    console.log(`[API-${requestId}] User credit balance:`, { 
      creditBalance: user.credit_balance,
      hasEnoughCredits: user.credit_balance >= 1
    })

    if (user.credit_balance < 1) {
      console.log(`[API-${requestId}] Insufficient credits - rejecting request`)
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Get the authorization token for authenticated requests
    const authToken = req.headers.get('Authorization')?.substring(7) // Remove 'Bearer ' prefix
    if (!authToken) {
      throw new Error('No auth token found')
    }

    const authenticatedSupabase = createAuthenticatedSupabaseClient(authToken)
    let finalProjectId = project_id

    // If no project_id provided, create a new project
    if (!finalProjectId) {
      const { data: newProject, error: projectError } = await authenticatedSupabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: 'New Clip Project',
          status: 'processing'
        })
        .select()
        .single()

      if (projectError || !newProject) {
        console.error(`[API-${requestId}] Failed to create project:`, {
          error: projectError,
          details: projectError?.details,
          hint: projectError?.hint,
          code: projectError?.code,
          message: projectError?.message
        })
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
      
      console.log(`[API-${requestId}] Created new project:`, { projectId: newProject.id })
      finalProjectId = newProject.id
    }

    // Get the next order number for this project
    console.log(`[API-${requestId}] Step 4: Getting next clip order for project`)
    const { data: existingClips, error: orderError } = await authenticatedSupabase
      .from('clips')
      .select('clip_order')
      .eq('project_id', finalProjectId)
      .order('clip_order', { ascending: false })
      .limit(1)

    const nextOrder = existingClips && existingClips.length > 0 
      ? existingClips[0].clip_order + 1 
      : 1

    console.log(`[API-${requestId}] Next clip order will be:`, { nextOrder })

    // Get the system prompt from admin configuration
    const systemPrompt = await getSystemPrompt()

    // Create clip record
    const { data: clip, error: clipError } = await authenticatedSupabase
      .from('clips')
      .insert({
        project_id: finalProjectId,
        image_url,
        status: 'pending',
        prompt: systemPrompt,
        regen_count: 0,
        clip_order: nextOrder
      })
      .select()
      .single()

    if (clipError || !clip) {
      console.error(`[API-${requestId}] Failed to create clip:`, {
        error: clipError,
        details: clipError?.details,
        hint: clipError?.hint,
        code: clipError?.code,
        message: clipError?.message
      })
      return new Response(
        JSON.stringify({ error: 'Failed to create clip' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }
    
    console.log(`[API-${requestId}] Step 5: Clip created successfully`, {
      clipId: clip.id,
      projectId: finalProjectId,
      status: clip.status,
      clipOrder: clip.clip_order
    })

    // Start Runway generation job
    try {
      console.log(`[API-${requestId}] Step 6: Starting Runway generation`)
      const runwayService = createRunwayService()
      const result = await runwayService.generateVideo({
        image_url: image_url,
        prompt: systemPrompt,
        duration: 5
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
      const serviceSupabase = createServiceSupabaseClient()
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
          credit_balance: user.credit_balance - 1 
        })
        .eq('id', user.id)

      if (creditError) {
        console.error('Error deducting credit:', creditError)
      }

      // Log the credit transaction
      await serviceSupabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -1,
          type: 'generation',
          reference_id: clip.id
        })

      console.log(`[API-${requestId}] Generation started successfully`)

      // Return success response
      const totalDuration = Date.now() - startTime
      console.log(`[API-${requestId}] === GENERATE REQUEST SUCCESS ===`, {
        totalDuration_ms: totalDuration,
        timestamp: new Date().toISOString()
      })

      return new Response(
        JSON.stringify({
          clip_id: clip.id,
          project_id: finalProjectId,
          status: 'processing',
          credits_remaining: user.credit_balance - 1,
          estimated_time: 25 // seconds
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )

    } catch (runwayError) {
      console.error('Error starting Runway generation:', runwayError)
      
      // Update clip status to failed
      const serviceSupabase = createServiceSupabaseClient()
      await serviceSupabase
        .from('clips')
        .update({
          status: 'failed',
          error_message: runwayError instanceof Error ? runwayError.message : 'Unknown error'
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
    const totalDuration = Date.now() - startTime
    
    console.error(`[API-${requestId}] === GENERATE REQUEST FAILED ===`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      totalDuration_ms: totalDuration,
      timestamp: new Date().toISOString()
    })
    
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

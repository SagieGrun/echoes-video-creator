// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createRunwayService } from '../_shared/runway.ts'
import { getAuthenticatedUser, createServiceSupabaseClient } from '../_shared/auth.ts'

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const requestId = Math.random().toString(36).substring(2, 15)
  
  console.log(`[STATUS-${requestId}] === STATUS CHECK START ===`, {
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
    // Check authentication
    console.log(`[STATUS-${requestId}] Step 1: Checking authentication`)
    const user = await getAuthenticatedUser(req)
    if (!user) {
      console.log(`[STATUS-${requestId}] Authentication failed - no user`)
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

    // Get clip ID from URL
    const url = new URL(req.url)
    const clipId = url.searchParams.get('clip_id')
    
    if (!clipId) {
      return new Response(
        JSON.stringify({ error: 'clip_id parameter is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    const serviceSupabase = createServiceSupabaseClient()

    // Get the clip from database
    console.log(`[STATUS-${requestId}] Step 2: Getting clip from database`)
    const { data: clip, error: clipError } = await serviceSupabase
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .single()

    if (clipError || !clip) {
      console.error(`[STATUS-${requestId}] Clip not found:`, clipError)
      return new Response(
        JSON.stringify({ error: 'Clip not found' }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Verify user has access to this clip
    const { data: project, error: projectError } = await serviceSupabase
      .from('projects')
      .select('user_id')
      .eq('id', clip.project_id)
      .single()

    if (projectError || !project || project.user_id !== user.id) {
      console.error(`[STATUS-${requestId}] User doesn't have access to clip:`, { 
        projectError, 
        projectUserId: project?.user_id, 
        userId: user.id 
      })
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { 
          status: 403,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`[STATUS-${requestId}] Clip found:`, {
      clipId: clip.id,
      status: clip.status,
      hasGenerationJobId: !!clip.generation_job_id,
      hasVideoUrl: !!clip.video_url
    })

    // If clip is already completed or failed, return current status
    if (clip.status === 'completed' || clip.status === 'failed') {
      console.log(`[STATUS-${requestId}] Clip is in final state:`, { status: clip.status })
      
      return new Response(
        JSON.stringify({
          clip_id: clip.id,
          status: clip.status,
          progress: clip.status === 'completed' ? 100 : 0,
          video_url: clip.video_url,
          error_message: clip.error_message,
          estimated_time: 0
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // If we have a generation job ID, check Runway status
    if (clip.generation_job_id) {
      console.log(`[STATUS-${requestId}] Step 3: Checking Runway status for job:`, { 
        jobId: clip.generation_job_id 
      })
      
      try {
        const runwayService = createRunwayService()
        const result = await runwayService.getJobStatus(clip.generation_job_id)
        
        console.log(`[STATUS-${requestId}] Runway status result:`, {
          taskId: result.task_id,
          status: result.status,
          progress: result.progress,
          hasVideoUrl: !!result.video_url,
          hasError: !!result.error_message
        })

        // Update clip in database with latest status
        const updateData: Record<string, any> = {
          status: result.status,
        }

        if (result.status === 'completed' && result.video_url) {
          updateData.video_url = result.video_url
          // Note: completed_at column doesn't exist in schema, so we skip it
        }

        if (result.status === 'failed' && result.error_message) {
          updateData.error_message = result.error_message
        }

        const { error: updateError } = await serviceSupabase
          .from('clips')
          .update(updateData)
          .eq('id', clip.id)

        if (updateError) {
          console.error(`[STATUS-${requestId}] Error updating clip:`, updateError)
          // Continue anyway, return the status we got from Runway
        }

        return new Response(
          JSON.stringify({
            clip_id: clip.id,
            status: result.status,
            progress: result.progress,
            video_url: result.video_url,
            error_message: result.error_message,
            estimated_time: result.estimated_time || 0
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
        console.error(`[STATUS-${requestId}] Error checking Runway status:`, runwayError)
        
        // Update clip to failed status
        await serviceSupabase
          .from('clips')
          .update({
            status: 'failed',
            error_message: 'Failed to check generation status'
          })
          .eq('id', clip.id)

        return new Response(
          JSON.stringify({
            clip_id: clip.id,
            status: 'failed',
            progress: 0,
            error_message: 'Failed to check generation status',
            estimated_time: 0
          }),
          { 
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      }
    }

    // If no generation job ID, return current status
    console.log(`[STATUS-${requestId}] No generation job ID, returning database status`)
    return new Response(
      JSON.stringify({
        clip_id: clip.id,
        status: clip.status,
        progress: clip.status === 'processing' ? 10 : 0,
        video_url: clip.video_url,
        error_message: clip.error_message,
        estimated_time: clip.status === 'processing' ? 120 : 0
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error(`[STATUS-${requestId}] === STATUS CHECK FAILED ===`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/clip-status' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
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
  
  console.log(`[DETAILS-${requestId}] === CLIP DETAILS START ===`, {
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'GET') {
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
    console.log(`[DETAILS-${requestId}] Step 1: Checking authentication`)
    const user = await getAuthenticatedUser(req)
    if (!user) {
      console.log(`[DETAILS-${requestId}] Authentication failed - no user`)
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

    // Get the clip with project information
    console.log(`[DETAILS-${requestId}] Step 2: Getting clip details from database`)
    const { data: clip, error: clipError } = await serviceSupabase
      .from('clips')
      .select(`
        *,
        projects (
          id,
          title,
          user_id,
          status,
          created_at
        )
      `)
      .eq('id', clipId)
      .single()

    if (clipError || !clip) {
      console.error(`[DETAILS-${requestId}] Clip not found:`, clipError)
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
    if (clip.projects?.user_id !== user.id) {
      console.error(`[DETAILS-${requestId}] User doesn't have access to clip:`, { 
        projectUserId: clip.projects?.user_id, 
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

    console.log(`[DETAILS-${requestId}] Clip details retrieved:`, {
      clipId: clip.id,
      status: clip.status,
      hasVideoUrl: !!clip.video_url,
      projectTitle: clip.projects?.title
    })

    // Return clip details
    const response = {
      clip: {
        id: clip.id,
        project_id: clip.project_id,
        image_url: clip.image_url,
        video_url: clip.video_url,
        prompt: clip.prompt,
        status: clip.status,
        runway_job_id: clip.runway_job_id,
        generation_job_id: clip.generation_job_id,
        error_message: clip.error_message,
        regen_count: clip.regen_count,
        clip_order: clip.clip_order,
        created_at: clip.created_at,
        completed_at: clip.completed_at
      },
      project: clip.projects ? {
        id: clip.projects.id,
        title: clip.projects.title,
        status: clip.projects.status,
        created_at: clip.projects.created_at
      } : null
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error(`[DETAILS-${requestId}] === CLIP DETAILS FAILED ===`, {
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/clip-details' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

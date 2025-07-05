// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createRunwayService } from '../_shared/runway.ts'
import { createKlingService } from '../_shared/kling.ts'
import { getAuthenticatedUser, createServiceSupabaseClient } from '../_shared/auth.ts'

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
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
      return 'runway'
    }

    const config = data.value
    const activeProvider = config.activeProvider || 'runway'

    console.log('Loaded provider configuration:', {
      activeProvider,
      providerName: config.providers?.[activeProvider]?.name
    })

    return activeProvider
  } catch (error) {
    console.error('Error loading provider configuration:', error)
    return 'runway'
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
  
  console.log(`[STATUS-${requestId}] === STATUS REQUEST START ===`, {
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
      console.error(`[STATUS-${requestId}] Authentication failed`)
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

    // Parse request body to get clip ID
    const requestBody = await req.json()
    const clipId = requestBody.clipId

    if (!clipId) {
      return new Response(
        JSON.stringify({ error: 'Missing clip_id parameter' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`[STATUS-${requestId}] Step 1: Checking status for clip:`, { clipId })

    // Get clip from database
    const serviceSupabase = createServiceSupabaseClient()
    const { data: clips, error: clipError } = await serviceSupabase
      .from('clips')
      .select(`
        *,
        projects!inner(
          user_id
        )
      `)
      .eq('id', clipId)
      .eq('projects.user_id', authUser.id)

    if (clipError || !clips || clips.length === 0) {
      console.error(`[STATUS-${requestId}] Clip not found or access denied:`, clipError)
      return new Response(
        JSON.stringify({ error: 'Clip not found or access denied' }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    const clip = clips[0]
    const project = clip.projects

    console.log(`[STATUS-${requestId}] Step 2: Clip found:`, { 
      clipId: clip.id,
      status: clip.status,
      hasJobId: !!clip.generation_job_id,
      hasVideoPath: !!clip.video_file_path
    })

    // If clip is already completed and has a video file, generate fresh signed URL
    if (clip.status === 'completed' && clip.video_file_path) {
      console.log(`[STATUS-${requestId}] Clip completed, generating fresh signed URL`)
      
      try {
        const { data: signedUrlData, error: urlError } = await serviceSupabase.storage
          .from('private-photos')
          .createSignedUrl(clip.video_file_path, 3600) // 1 hour expiry
        
        let videoUrl = clip.video_url
        if (!urlError && signedUrlData?.signedUrl) {
          videoUrl = signedUrlData.signedUrl
          console.log(`[STATUS-${requestId}] Fresh signed URL generated`)
        } else {
          console.warn(`[STATUS-${requestId}] Failed to generate signed URL:`, urlError)
        }
        
        return new Response(
          JSON.stringify({
            clip_id: clip.id,
            status: clip.status,
            progress: clip.status === 'completed' ? 100 : 0,
            video_url: videoUrl,
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
      } catch (error) {
        console.error(`[STATUS-${requestId}] Error generating signed URL:`, error)
        // Continue with existing video_url
      }
      
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

    // If we have a generation job ID, check provider status
    if (clip.generation_job_id) {
      console.log(`[STATUS-${requestId}] Step 3: Checking provider status for job:`, { 
        jobId: clip.generation_job_id 
      })
      
      try {
        // Get active provider
        const activeProvider = await getActiveProvider()
        const videoService = createVideoService(activeProvider)
        
        console.log(`[STATUS-${requestId}] Using ${activeProvider} service for status check`)
        
        const result = await videoService.getJobStatus(clip.generation_job_id)
        
        console.log(`[STATUS-${requestId}] Provider status result:`, {
          provider: activeProvider,
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
          // Download video from provider's temporary URL and store permanently
          try {
            console.log(`[STATUS-${requestId}] Downloading video from ${activeProvider} URL`)
            const videoResponse = await fetch(result.video_url)
            if (!videoResponse.ok) {
              throw new Error(`Failed to download video: ${videoResponse.status}`)
            }
            
            const videoBuffer = await videoResponse.arrayBuffer()
            console.log(`[STATUS-${requestId}] Video downloaded, size: ${videoBuffer.byteLength} bytes`)
            
            // Generate permanent storage path
            const fileName = `${clip.id}_${Date.now()}.mp4`
            const filePath = `${project.user_id}/${clip.project_id}/${fileName}`
            
            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await serviceSupabase.storage
              .from('private-photos') // Using same bucket as images for simplicity
              .upload(filePath, videoBuffer, {
                contentType: 'video/mp4',
                cacheControl: '3600',
                upsert: false
              })
            
            if (uploadError) {
              console.error(`[STATUS-${requestId}] Error uploading video:`, uploadError)
              throw uploadError
            }
            
            console.log(`[STATUS-${requestId}] Video uploaded successfully to:`, filePath)
            
            // Store the permanent file path for signed URL generation
            updateData.video_file_path = filePath // Store path for generateClipUrls to use
            updateData.video_url = filePath // Keep for backward compatibility
            
          } catch (error) {
            console.error(`[STATUS-${requestId}] Error storing video permanently:`, error)
            // Fall back to temporary URL for now, but log the issue
            updateData.video_url = result.video_url
            updateData.error_message = 'Video generated but storage failed'
          }
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
          // Continue anyway, return the status we got from provider
        }

        // Generate signed URL for the stored video
        let finalVideoUrl = updateData.video_url || result.video_url
        if (result.status === 'completed' && updateData.video_file_path) {
          try {
            const { data: signedUrlData, error: urlError } = await serviceSupabase.storage
              .from('private-photos')
              .createSignedUrl(updateData.video_file_path, 3600) // 1 hour expiry
            
            if (!urlError && signedUrlData?.signedUrl) {
              finalVideoUrl = signedUrlData.signedUrl
              console.log(`[STATUS-${requestId}] Generated fresh signed URL for newly completed clip`)
            }
          } catch (error) {
            console.error(`[STATUS-${requestId}] Error generating signed URL for new clip:`, error)
            // Fall back to file path
          }
        }

        return new Response(
          JSON.stringify({
            clip_id: clip.id,
            status: result.status,
            progress: result.progress,
            video_url: finalVideoUrl,
            error_message: result.error_message,
            estimated_time: result.estimated_time || 0,
            provider: activeProvider // Include provider info for debugging
          }),
          { 
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )

      } catch (providerError) {
        console.error(`[STATUS-${requestId}] Error checking provider status:`, providerError)
        
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
    console.error(`[STATUS-${requestId}] Unexpected error:`, error)
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

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth'
import { getRunwayService } from '@/lib/runway'
import { validateImageForRunway } from '@/lib/image-processor'
import { getSystemPrompt } from '@/lib/admin-config'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Background job polling function
async function pollJobStatus(clipId: string, taskId: string) {
  const runwayService = getRunwayService()
  const maxAttempts = 60 // 10 minutes maximum (10 second intervals)
  let attempts = 0

  const poll = async () => {
    try {
      attempts++
      
      const result = await runwayService.getJobStatus(taskId)
      
      // Update clip status in database
      const updateData: any = {
        status: result.status
      }

      if (result.status === 'completed' && result.video_url) {
        updateData.video_url = result.video_url
        updateData.completed_at = new Date().toISOString()
      }

      if (result.status === 'failed') {
        updateData.error_message = result.error_message || 'Generation failed'
      }

      await supabase
        .from('clips')
        .update(updateData)
        .eq('id', clipId)

      // Continue polling if still processing and haven't exceeded max attempts
      if ((result.status === 'pending' || result.status === 'processing') && attempts < maxAttempts) {
        setTimeout(poll, 10000) // Poll every 10 seconds (as recommended by Runway)
      }
      
    } catch (error) {
      console.error('Error polling job status:', error)
      
      // If we've exceeded max attempts, mark as failed
      if (attempts >= maxAttempts) {
        await supabase
          .from('clips')
          .update({
            status: 'failed',
            error_message: 'Generation timeout or polling error'
          })
          .eq('id', clipId)
      } else {
        // Retry polling
        setTimeout(poll, 10000)
      }
    }
  }

  // Start polling after a short delay
  setTimeout(poll, 5000)
}



export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 15)
  const startTime = Date.now()
  
  console.log(`[API-${requestId}] === GENERATE REQUEST START ===`, {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  
  try {
    // Check authentication
    console.log(`[API-${requestId}] Step 1: Checking authentication`)
    const user = await getAuthenticatedUser()
    if (!user) {
      console.log(`[API-${requestId}] Authentication failed - no user`)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log(`[API-${requestId}] User authenticated:`, { 
      userId: user.id, 
      email: user.email 
    })

    console.log(`[API-${requestId}] Step 2: Parsing request body`)
    const { image_url, project_id } = await request.json()
    
    console.log(`[API-${requestId}] Request parameters:`, {
      hasImageUrl: !!image_url,
      imageUrlLength: image_url?.length || 0,
      imageUrlPrefix: image_url ? image_url.substring(0, 50) + '...' : 'none',
      hasProjectId: !!project_id,
      projectId: project_id
    })
    
    if (!image_url) {
      console.error(`[API-${requestId}] Missing image_url parameter`)
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Check user's credit balance using authenticated client
    console.log(`[API-${requestId}] Step 3: Checking user credit balance`)
    
    // Create authenticated client for RLS-protected queries
    const cookieStore = cookies()
    const authenticatedSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // No-op for API routes
          },
          remove(name: string, options: any) {
            // No-op for API routes
          },
        },
      }
    )
    
    // Debug: Check if we have a session
    const { data: { session }, error: sessionError } = await authenticatedSupabase.auth.getSession()
    console.log(`[API-${requestId}] Session check:`, { 
      hasSession: !!session, 
      sessionUserId: session?.user?.id,
      expectedUserId: user.id,
      sessionError: sessionError?.message 
    })
    
    let { data: userData, error: userError } = await authenticatedSupabase
      .from('users')
      .select('credit_balance')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error(`[API-${requestId}] Failed to fetch user data:`, {
        error: userError,
        userId: user.id,
        hasSession: !!session
      })
      
      // Fallback: Try with service role client for debugging
      console.log(`[API-${requestId}] Attempting fallback with service role client`)
      const { data: fallbackUserData, error: fallbackError } = await supabase
        .from('users')
        .select('credit_balance')
        .eq('id', user.id)
        .single()
      
      if (fallbackError || !fallbackUserData) {
        console.error(`[API-${requestId}] Fallback also failed:`, fallbackError)
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        )
      }
      
      console.log(`[API-${requestId}] Fallback successful, using service role data`)
      userData = fallbackUserData
    }

    console.log(`[API-${requestId}] User credit balance:`, { 
      creditBalance: userData.credit_balance,
      hasEnoughCredits: userData.credit_balance >= 1
    })

    if (userData.credit_balance < 1) {
      console.log(`[API-${requestId}] Insufficient credits - rejecting request`)
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      )
    }

    let finalProjectId = project_id

    // If no project_id provided, create a new project using authenticated client
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
        return NextResponse.json(
          { error: 'Failed to create project' },
          { status: 500 }
        )
      }
      
      console.log(`[API-${requestId}] Created new project:`, { projectId: newProject.id })
      finalProjectId = newProject.id
    }

    // Get the system prompt from admin configuration
    const systemPrompt = await getSystemPrompt()

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

    // Create clip record using authenticated client
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
      return NextResponse.json(
        { error: 'Failed to create clip' },
        { status: 500 }
      )
    }
    
    console.log(`[API-${requestId}] Step 5: Clip created successfully`, {
      clipId: clip.id,
      projectId: finalProjectId,
      status: clip.status,
      clipOrder: clip.clip_order
    })

    // Validate image for Runway before generation
    try {
      const imageResponse = await fetch(image_url)
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      const validation = await validateImageForRunway(imageBuffer)
      
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Image validation failed: ${validation.errors.join(', ')}` },
          { status: 400 }
        )
      }

      // Start Runway generation job
      const runwayService = getRunwayService()
      const result = await runwayService.generateVideo({
        image_url: image_url,
        prompt: systemPrompt,
        duration: 5
      })

      if (result.status === 'failed') {
        return NextResponse.json(
          { error: result.error_message || 'Failed to start generation' },
          { status: 500 }
        )
      }

      // Update clip with generation task ID and set status to processing
      const { error: updateError } = await supabase
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

      // Deduct 1 credit from user using authenticated client
      const { error: creditError } = await authenticatedSupabase
        .from('users')
        .update({ 
          credit_balance: userData.credit_balance - 1 
        })
        .eq('id', user.id)

      if (creditError) {
        console.error('Error deducting credit:', creditError)
        // Log the transaction for manual reconciliation
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: -1,
            type: 'generation',
            reference_id: clip.id
          })
      } else {
        // Log the successful credit deduction
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: -1,
            type: 'generation',
            reference_id: clip.id
          })
      }

      // Start background job polling
      pollJobStatus(clip.id, result.task_id)

      // Return success response
      return NextResponse.json({
        clip_id: clip.id,
        project_id: finalProjectId,
        status: 'processing',
        credits_remaining: userData.credit_balance - 1,
        estimated_time: 25 // seconds
      })

    } catch (runwayError) {
      console.error('Error starting Runway generation:', runwayError)
      
      // Update clip status to failed
      await supabase
        .from('clips')
        .update({
          status: 'failed',
          error_message: runwayError instanceof Error ? runwayError.message : 'Unknown error'
        })
        .eq('id', clip.id)

      return NextResponse.json(
        { error: 'Failed to start video generation' },
        { status: 500 }
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
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    const totalDuration = Date.now() - startTime
    console.log(`[API-${requestId}] === GENERATE REQUEST END ===`, {
      totalDuration_ms: totalDuration,
      timestamp: new Date().toISOString()
    })
  }
} 
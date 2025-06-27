import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic'

// Increase the maximum duration for this API route
export const maxDuration = 60 // 1 minute for async processing

// Lambda function name (will be set after deployment)
const LAMBDA_FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME || 'echoes-video-compiler-VideoCompilerFunction-JvzfHTxrB5vO'

// Create service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Lambda client with explicit credentials
const lambdaClient = new LambdaClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

export async function POST(request: NextRequest) {
  try {
    // Debug: Log environment variables (without exposing secrets)
    console.log('Environment check:', {
      hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
      lambdaFunctionName: LAMBDA_FUNCTION_NAME,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    // Check authentication - get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Create client with user token for auth check
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { selectedClips, selectedMusic, settings } = body

    if (!selectedClips || selectedClips.length === 0) {
      return NextResponse.json({ error: 'No clips selected' }, { status: 400 })
    }

    // Check if we have AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('Missing AWS credentials')
      return NextResponse.json({ 
        error: 'AWS credentials not configured. Please check environment variables.',
        debug: {
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
        }
      }, { status: 500 })
    }

    // Create a processing record in the database first
    const processingRecord = {
      user_id: user.id,
      selected_clips: selectedClips.map((clip: any) => clip.id),
      music_track_id: selectedMusic?.id || null,
      transition_type: settings?.transitionType || 'fade',
      music_volume: selectedMusic ? (settings?.musicVolume || 0.3) : null,
      output_aspect_ratio: settings?.output_aspect_ratio || '16:9',
      status: 'processing'
    }

    const { data: finalVideo, error: dbError } = await supabaseAdmin
      .from('final_videos')
      .insert(processingRecord)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to create processing record', details: dbError.message }, { status: 500 })
    }

    // Prepare data for Lambda function
    const lambdaPayload = {
      user_id: user.id,
      video_id: finalVideo.id, // Include the video ID for status updates
      clips: selectedClips.map((clip: any, index: number) => ({
        id: clip.id,
        video_file_path: clip.video_file_path,
        order: index + 1
      })),
      music: selectedMusic ? {
        id: selectedMusic.id,
        file_path: selectedMusic.file_path,
        volume: settings?.musicVolume || 0.3
      } : null,
      settings: {
        transition_type: settings?.transitionType || 'fade',
        transition_duration: parseFloat(settings?.transitionDuration || '1.0'),
        output_aspect_ratio: settings?.output_aspect_ratio || '16:9'
      }
    }

    // Call Lambda function asynchronously using AWS SDK
    console.log('Starting async Lambda function call with function:', LAMBDA_FUNCTION_NAME)
    
    try {
      const command = new InvokeCommand({
        FunctionName: LAMBDA_FUNCTION_NAME,
        InvocationType: 'Event', // Asynchronous invocation
        Payload: JSON.stringify({
          body: JSON.stringify(lambdaPayload)
        })
      })

      console.log('Sending Lambda command...')
      const response = await lambdaClient.send(command)
      console.log('Lambda response:', { statusCode: response.StatusCode, payload: response.Payload })
      
      if (response.StatusCode === 202) {
        console.log('Lambda function started successfully (async)')
        
        // Return immediately with processing status
        return NextResponse.json({
          message: 'Video compilation started',
          video_id: finalVideo.id,
          status: 'processing'
        })
      } else {
        console.error('Lambda function failed to start:', response)
        
        // Update status to failed (with safe error handling)
        try {
          await supabaseAdmin
            .from('final_videos')
            .update({ status: 'failed' })
            .eq('id', finalVideo.id)
        } catch (updateError) {
          console.error('Failed to update status to failed:', updateError)
        }
        
        return NextResponse.json({ error: 'Failed to start video compilation' }, { status: 500 })
      }

    } catch (error) {
      console.error('Error starting Lambda function:', error)
      
      // Update status to failed (with safe error handling)
      try {
        await supabaseAdmin
          .from('final_videos')
          .update({ status: 'failed' })
          .eq('id', finalVideo.id)
      } catch (updateError) {
        console.error('Failed to update status to failed:', updateError)
      }
      
      return NextResponse.json({ 
        error: 'Failed to start video compilation',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in video compilation:', error)
    return NextResponse.json(
      { error: 'Failed to compile video' },
      { status: 500 }
    )
  }
} 
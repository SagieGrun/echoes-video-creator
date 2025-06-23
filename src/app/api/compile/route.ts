import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Increase the maximum duration for this API route
export const maxDuration = 300 // 5 minutes

// This will be set after Lambda deployment
const LAMBDA_ENDPOINT = process.env.LAMBDA_COMPILE_ENDPOINT || ''

export async function POST(request: NextRequest) {
  try {
    // Check authentication - get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { selectedClips, selectedMusic, settings } = body

    if (!selectedClips || selectedClips.length === 0) {
      return NextResponse.json({ error: 'No clips selected' }, { status: 400 })
    }

    // Prepare data for Lambda function
    const lambdaPayload = {
      user_id: user.id,
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
        transition_duration: parseFloat(settings?.transitionDuration || '1.0')
      }
    }

    if (!LAMBDA_ENDPOINT) {
      // For development - return mock response
      return NextResponse.json({
        message: 'Lambda endpoint not configured. Please deploy the Lambda function first.',
        mock: true,
        payload: lambdaPayload
      })
    }

    // Call Lambda function with increased timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout
    
    console.log('Starting Lambda function call...')
    const startTime = Date.now()
    
    try {
      const lambdaResponse = await fetch(LAMBDA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lambdaPayload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const duration = Date.now() - startTime
      console.log(`Lambda function completed in ${duration}ms`)

      if (!lambdaResponse.ok) {
        const errorText = await lambdaResponse.text()
        console.error('Lambda function error:', errorText)
        throw new Error(`Lambda function failed: ${errorText}`)
      }

      const result = await lambdaResponse.json()
      console.log('Lambda function succeeded:', result)
      
      return NextResponse.json(result)
    } catch (error) {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime
      console.error(`Lambda function failed after ${duration}ms:`, error)
      throw error
    }

  } catch (error) {
    console.error('Error in video compilation:', error)
    return NextResponse.json(
      { error: 'Failed to compile video' },
      { status: 500 }
    )
  }
} 
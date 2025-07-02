import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic'

// Create service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Status API called at:', new Date().toISOString())
    
    // Check authentication - get user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header provided')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('🎫 Extracted token:', token ? 'Present' : 'Missing')
    
    // Create client with user token for auth check
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    
    console.log('👤 User auth result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authError: authError ? authError.message : null 
    })
    
    if (authError || !user) {
      console.log('❌ User authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get video_id from query parameters
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('video_id')
    console.log('🎬 Requested video ID:', videoId)

    if (!videoId) {
      console.log('❌ No video_id parameter provided')
      return NextResponse.json({ error: 'video_id parameter required' }, { status: 400 })
    }

    // Get video status from database
    console.log('🔍 Querying database for video:', { videoId, userId: user.id })
    
    const { data: finalVideo, error: dbError } = await supabaseAdmin
      .from('final_videos')
      .select('id, status, file_path, error_message, created_at, completed_at')
      .eq('id', videoId)
      .eq('user_id', user.id) // Ensure user can only check their own videos
      .single()

    console.log('📊 Database query result:', { 
      found: !!finalVideo, 
      error: dbError ? dbError.message : null,
      videoId, 
      userId: user.id 
    })

    if (finalVideo) {
      console.log('✅ Video found in database:', {
        id: finalVideo.id,
        status: finalVideo.status,
        file_path: finalVideo.file_path,
        error_message: finalVideo.error_message,
        created_at: finalVideo.created_at,
        completed_at: finalVideo.completed_at
      })
    }

    if (dbError || !finalVideo) {
      console.error('❌ Video not found in database:', { dbError, videoId, userId: user.id })
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const responseData = {
      video_id: finalVideo.id,
      status: finalVideo.status,
      file_path: finalVideo.file_path,
      error_message: finalVideo.error_message,
      created_at: finalVideo.created_at,
      completed_at: finalVideo.completed_at
    }

    console.log('📤 Returning response:', JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💀 Error in status API:', error)
    console.error('📍 Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Failed to check video status' },
      { status: 500 }
    )
  }
} 
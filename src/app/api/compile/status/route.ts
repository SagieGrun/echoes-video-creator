import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
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

    // Get video_id from query parameters
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('video_id')

    if (!videoId) {
      return NextResponse.json({ error: 'video_id parameter required' }, { status: 400 })
    }

    // Get video status from database
    const { data: finalVideo, error: dbError } = await supabaseAdmin
      .from('final_videos')
      .select('id, status, file_path, error_message, created_at, completed_at')
      .eq('id', videoId)
      .eq('user_id', user.id) // Ensure user can only check their own videos
      .single()

    if (dbError || !finalVideo) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json({
      video_id: finalVideo.id,
      status: finalVideo.status,
      file_path: finalVideo.file_path,
      error_message: finalVideo.error_message,
      created_at: finalVideo.created_at,
      completed_at: finalVideo.completed_at
    })

  } catch (error) {
    console.error('Error checking video status:', error)
    return NextResponse.json(
      { error: 'Failed to check video status' },
      { status: 500 }
    )
  }
} 
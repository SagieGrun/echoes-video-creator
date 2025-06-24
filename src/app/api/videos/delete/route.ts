import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/videos/delete - Request received')
    
    // Check authentication - get user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('Authorization header present:', !!authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header')
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    console.log('Token extracted, length:', token?.length)
    
    // Create authenticated client with user token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    
    console.log('Auth check result:', { userId: user?.id, hasError: !!authError })
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get video ID from request body
    const { videoId } = await request.json()
    console.log('Video ID to delete:', videoId)
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // First, get the video details to check ownership and get file path
    console.log('Querying for video with user_id:', user.id)
    const { data: video, error: fetchError } = await supabaseUser
      .from('final_videos')
      .select('id, user_id, file_path')
      .eq('id', videoId)
      .eq('user_id', user.id) // Ensure user owns the video
      .single()

    console.log('Database query result:', { video, fetchError })

    if (fetchError || !video) {
      console.log('Video not found. Error:', fetchError)
      return NextResponse.json({ error: 'Video not found or access denied' }, { status: 404 })
    }

    // Delete the file from storage if it exists
    if (video.file_path) {
      const { error: storageError } = await supabaseUser.storage
        .from('final-videos')
        .remove([video.file_path])
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      } else {
        console.log(`Successfully deleted file from storage: ${video.file_path}`)
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabaseUser
      .from('final_videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting video from database:', deleteError)
      return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
    }

    console.log(`Successfully deleted video ${videoId} for user ${user.id}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Video deleted successfully' 
    })

  } catch (error) {
    console.error('Error in video deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 
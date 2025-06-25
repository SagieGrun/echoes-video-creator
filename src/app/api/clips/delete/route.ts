import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/clips/delete - Request received')
    
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

    // Get clip ID from request body
    const { clipId } = await request.json()
    console.log('Clip ID to delete:', clipId)
    
    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID is required' }, { status: 400 })
    }

    // First, get the clip details to check ownership and get file paths
    console.log('Querying for clip with user_id via project relationship')
    const { data: clip, error: fetchError } = await supabaseUser
      .from('clips')
      .select(`
        id, 
        image_file_path,
        video_file_path,
        project_id,
        projects!inner(user_id)
      `)
      .eq('id', clipId)
      .eq('projects.user_id', user.id) // Ensure user owns the project that contains the clip
      .single()

    console.log('Database query result:', { clip, fetchError })

    if (fetchError || !clip) {
      console.log('Clip not found. Error:', fetchError)
      return NextResponse.json({ error: 'Clip not found or access denied' }, { status: 404 })
    }

    // Delete files from storage if they exist
    const filesToDelete = []
    
    if (clip.image_file_path) {
      filesToDelete.push(clip.image_file_path)
    }
    
    if (clip.video_file_path) {
      filesToDelete.push(clip.video_file_path)
    }

    if (filesToDelete.length > 0) {
      // Delete from images bucket
      if (clip.image_file_path) {
        const { error: imageStorageError } = await supabaseUser.storage
          .from('images')
          .remove([clip.image_file_path])
        
        if (imageStorageError) {
          console.error('Error deleting image from storage:', imageStorageError)
          // Continue with deletion even if storage fails
        } else {
          console.log(`Successfully deleted image from storage: ${clip.image_file_path}`)
        }
      }

      // Delete from clips bucket
      if (clip.video_file_path) {
        const { error: videoStorageError } = await supabaseUser.storage
          .from('clips')
          .remove([clip.video_file_path])
        
        if (videoStorageError) {
          console.error('Error deleting video from storage:', videoStorageError)
          // Continue with deletion even if storage fails
        } else {
          console.log(`Successfully deleted video from storage: ${clip.video_file_path}`)
        }
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabaseUser
      .from('clips')
      .delete()
      .eq('id', clipId)

    if (deleteError) {
      console.error('Error deleting clip from database:', deleteError)
      return NextResponse.json({ error: 'Failed to delete clip' }, { status: 500 })
    }

    console.log(`Successfully deleted clip ${clipId} for user ${user.id}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Clip deleted successfully' 
    })

  } catch (error) {
    console.error('Error in clip deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 
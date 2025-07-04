import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

// GET endpoint to fetch all music tracks
export async function GET(request: NextRequest) {
  console.log('🎵 [MUSIC TRACKS] GET request received')
  
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { data, error } = await supabaseServiceRole
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    console.log('🎵 [MUSIC TRACKS] Successfully fetched tracks:', data?.length || 0)
    return NextResponse.json({ tracks: data })
  } catch (error) {
    console.error('🎵 [MUSIC TRACKS] Error fetching tracks:', error)
    return NextResponse.json({ error: 'Failed to fetch music tracks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Allow larger files - let's try 15MB and see what happens
    const maxSizeInBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is 15MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.` 
      }, { status: 413 })
    }

    // Upload to Supabase and save to database - exactly like it worked before
    const fileBuffer = await file.arrayBuffer()
    const filePath = `music/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabaseServiceRole.storage
      .from('music-tracks')
      .upload(filePath, fileBuffer, { contentType: file.type })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabaseServiceRole.storage
      .from('music-tracks')
      .getPublicUrl(filePath)

    const { data: dbData, error: dbError } = await supabaseServiceRole
      .from('music_tracks')
      .insert({
        name: file.name,
        file_url: urlData.publicUrl,
        file_path: filePath,
        is_active: true,
        file_size: file.size,
      })
      .select()
      .single()

    if (dbError) {
      await supabaseServiceRole.storage.from('music-tracks').remove([filePath])
      throw new Error(`Database save failed: ${dbError.message}`)
    }

    return NextResponse.json({ success: true, track: dbData })
  } catch (error) {
    console.error('Music upload error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, file_path } = body

    if (!id || !file_path) {
      return NextResponse.json({ error: 'Track ID and file path are required' }, { status: 400 })
    }

    // Check if any final_videos are using this music track
    const { data: affectedVideos, error: checkError } = await supabaseServiceRole
      .from('final_videos')
      .select('id, created_at, status')
      .eq('music_track_id', id)

    if (checkError) {
      console.error('Error checking affected videos:', checkError)
      return NextResponse.json({ error: 'Failed to check affected videos' }, { status: 500 })
    }

    console.log(`Deleting music track ${id}. Affected videos: ${affectedVideos?.length || 0}`)
    
    // Delete from storage first
    const { error: storageError } = await supabaseServiceRole.storage
      .from('music-tracks')
      .remove([file_path])
    
    if (storageError) {
      console.error('Error deleting from storage:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete from database (foreign key constraint will set music_track_id to NULL in final_videos)
    const { error: dbError } = await supabaseServiceRole
      .from('music_tracks')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('Database deletion error:', dbError)
      throw new Error(`Failed to delete track from database: ${dbError.message}`)
    }

    console.log(`Successfully deleted music track ${id}`)
    
    // Return success with information about affected videos
    return NextResponse.json({ 
      success: true, 
      message: `Music track deleted successfully. ${affectedVideos?.length || 0} videos had their music removed.`,
      affectedVideos: affectedVideos?.length || 0
    })
  } catch (error) {
    console.error('Error deleting music track:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: `Failed to delete music track: ${errorMessage}` }, { status: 500 })
  }
} 
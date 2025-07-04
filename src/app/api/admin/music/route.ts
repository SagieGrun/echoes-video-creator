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

// POST endpoint removed - music uploads now use direct client-to-Supabase uploads
// via /api/admin/music/presigned-url and /api/admin/music/complete-upload endpoints

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
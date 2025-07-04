import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

// Configure route for file uploads - App Router configuration
export const maxDuration = 60 // 60 seconds for file uploads
export const runtime = 'nodejs'
export const preferredRegion = 'auto'

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { data, error } = await supabaseServiceRole
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ tracks: data })
  } catch (error) {
    console.error('Error fetching music tracks:', error)
    return NextResponse.json({ error: 'Failed to fetch music tracks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    // Parse form data with better error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error('Error parsing form data:', error)
      // This is likely a body size limit issue
      return NextResponse.json({ 
        error: 'File too large or invalid form data. Maximum file size is 50MB. Please try with a smaller file.' 
      }, { status: 413 })
    }

    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file size (50MB max)
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ 
        error: `File size too large. Maximum allowed size is 50MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.` 
      }, { status: 413 })
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      }, { status: 400 })
    }

    console.log(`Processing file upload: ${file.name} (${Math.round(file.size / (1024 * 1024))}MB)`)

    const fileBuffer = await file.arrayBuffer();
    const filePath = `music/${Date.now()}_${file.name}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseServiceRole.storage
      .from('music-tracks')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload file to storage: ${uploadError.message}`)
    }

    const { data: urlData } = supabaseServiceRole.storage
      .from('music-tracks')
      .getPublicUrl(filePath)

    // Insert into database
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
      console.error('Database insert error:', dbError)
      // Clean up uploaded file if database insert fails
      await supabaseServiceRole.storage
        .from('music-tracks')
        .remove([filePath])
      throw new Error(`Failed to save track to database: ${dbError.message}`)
    }

    console.log(`Successfully uploaded track: ${file.name}`)
    return NextResponse.json({ success: true, track: dbData })
  } catch (error) {
    console.error('Error uploading music track:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: `Failed to upload music track: ${errorMessage}` }, { status: 500 })
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
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  console.log('✅ [COMPLETE UPLOAD] POST request received')
  
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) {
    console.log('✅ [COMPLETE UPLOAD] Admin auth failed')
    return authError
  }
  console.log('✅ [COMPLETE UPLOAD] Admin auth passed')

  try {
    const { filePath, fileName, fileSize } = await request.json()
    console.log('✅ [COMPLETE UPLOAD] Request data:', { filePath, fileName, fileSize })

    if (!filePath || !fileName || !fileSize) {
      return NextResponse.json({ 
        error: 'Missing required fields: filePath, fileName, fileSize' 
      }, { status: 400 })
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabaseServiceRole.storage
      .from('music-tracks')
      .getPublicUrl(filePath)

    console.log('✅ [COMPLETE UPLOAD] Public URL generated:', urlData.publicUrl)

    // Insert into database
    const { data: dbData, error: dbError } = await supabaseServiceRole
      .from('music_tracks')
      .insert({
        name: fileName,
        file_url: urlData.publicUrl,
        file_path: filePath,
        is_active: true,
        file_size: fileSize,
      })
      .select()
      .single()

    if (dbError) {
      console.error('✅ [COMPLETE UPLOAD] Database insert error:', dbError)
      
      // Clean up uploaded file if database insert fails
      console.log('✅ [COMPLETE UPLOAD] Cleaning up uploaded file due to database error')
      await supabaseServiceRole.storage
        .from('music-tracks')
        .remove([filePath])
      
      throw new Error(`Failed to save track to database: ${dbError.message}`)
    }

    console.log('✅ [COMPLETE UPLOAD] Successfully completed upload and database insertion')
    return NextResponse.json({ 
      success: true, 
      track: dbData,
      message: `Successfully uploaded and saved: ${fileName}`
    })
  } catch (error) {
    console.error('✅ [COMPLETE UPLOAD] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: `Failed to complete upload: ${errorMessage}` 
    }, { status: 500 })
  }
} 
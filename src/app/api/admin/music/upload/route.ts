import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  console.log('🎵 [SIMPLE UPLOAD] POST request received')
  
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const fileName = formData.get('fileName') as string
    const fileType = formData.get('fileType') as string
    const fileSize = parseInt(formData.get('fileSize') as string)
    
    console.log('🎵 [SIMPLE UPLOAD] Form data received:', { fileName, fileType, fileSize })

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file size (50MB max)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ 
        error: `File too large: ${Math.round(fileSize / (1024 * 1024))}MB. Max 50MB.` 
      }, { status: 413 })
    }

    // Generate file path
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `music/${timestamp}_${sanitizedName}`

    console.log('🎵 [SIMPLE UPLOAD] Creating pre-signed URL for:', filePath)

    // Create pre-signed URL
    const { data, error } = await supabaseServiceRole.storage
      .from('music-tracks')
      .createSignedUploadUrl(filePath, { upsert: true })

    if (error) {
      console.error('🎵 [SIMPLE UPLOAD] Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    console.log('🎵 [SIMPLE UPLOAD] Pre-signed URL created successfully')
    
    return NextResponse.json({ 
      uploadUrl: data.signedUrl,
      filePath: filePath,
      fileName: fileName
    })
  } catch (error) {
    console.error('🎵 [SIMPLE UPLOAD] Error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
} 
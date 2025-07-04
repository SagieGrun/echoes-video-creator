import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  console.log('🔗 [PRESIGNED URL] POST request received')
  
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) {
    console.log('🔗 [PRESIGNED URL] Admin auth failed')
    return authError
  }
  console.log('🔗 [PRESIGNED URL] Admin auth passed')

  try {
    const { fileName, fileType, fileSize } = await request.json()
    console.log('🔗 [PRESIGNED URL] Request data:', { fileName, fileType, fileSize })

    // Validate file size (50MB max)
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    if (fileSize > maxSizeInBytes) {
      console.log('🔗 [PRESIGNED URL] File size too large:', fileSize)
      return NextResponse.json({ 
        error: `File size too large. Maximum allowed size is 50MB. Your file is ${Math.round(fileSize / (1024 * 1024))}MB.` 
      }, { status: 413 })
    }

    // Validate file type with better logging and more flexible validation
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
    const fileExtension = fileName.toLowerCase().split('.').pop();
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    
    console.log('🔗 [PRESIGNED URL] File type validation:', {
      fileName,
      fileType,
      fileExtension,
      allowedTypes,
      allowedExtensions,
      typeAllowed: allowedTypes.includes(fileType),
      extensionAllowed: allowedExtensions.includes(fileExtension || '')
    })
    
    // Check both MIME type and file extension for better compatibility
    const isValidType = allowedTypes.includes(fileType) || allowedExtensions.includes(fileExtension || '');
    
    if (!isValidType) {
      console.log('🔗 [PRESIGNED URL] Invalid file type and extension:', { fileType, fileExtension })
      return NextResponse.json({ 
        error: `Invalid file type. File type: "${fileType}", Extension: "${fileExtension}". Allowed types: ${allowedTypes.join(', ')}. Allowed extensions: ${allowedExtensions.join(', ')}` 
      }, { status: 400 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const filePath = `music/${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    console.log('🔗 [PRESIGNED URL] Generated file path:', filePath)

    // Create pre-signed URL for upload (valid for 5 minutes)
    const { data, error } = await supabaseServiceRole.storage
      .from('music-tracks')
      .createSignedUploadUrl(filePath, {
        upsert: true
      })

    if (error) {
      console.error('🔗 [PRESIGNED URL] Error creating signed URL:', error)
      throw new Error(`Failed to create upload URL: ${error.message}`)
    }

    console.log('🔗 [PRESIGNED URL] Pre-signed URL created successfully')
    
    return NextResponse.json({ 
      uploadUrl: data.signedUrl,
      filePath: filePath,
      fileName: fileName,
      fileSize: fileSize,
      message: 'Pre-signed URL generated successfully'
    })
  } catch (error) {
    console.error('🔗 [PRESIGNED URL] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: `Failed to generate upload URL: ${errorMessage}` 
    }, { status: 500 })
  }
} 
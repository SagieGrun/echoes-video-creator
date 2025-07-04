import { NextRequest, NextResponse } from 'next/server'

// Configure route for file uploads - App Router configuration
export const maxDuration = 60 // 60 seconds for file uploads
export const runtime = 'nodejs'
export const preferredRegion = 'auto'

export async function POST(request: NextRequest) {
  console.log('🧪 [TEST UPLOAD] POST request received')
  console.log('🧪 [TEST UPLOAD] Request URL:', request.url)
  console.log('🧪 [TEST UPLOAD] Content-Length header:', request.headers.get('content-length'))
  console.log('🧪 [TEST UPLOAD] Content-Type header:', request.headers.get('content-type'))
  console.log('🧪 [TEST UPLOAD] All headers:', Object.fromEntries(request.headers.entries()))

  try {
    // Test if we can parse form data
    let formData: FormData
    try {
      console.log('🧪 [TEST UPLOAD] Attempting to parse form data...')
      formData = await request.formData()
      console.log('🧪 [TEST UPLOAD] Form data parsed successfully')
    } catch (error) {
      console.error('🧪 [TEST UPLOAD] Error parsing form data:', error)
      console.error('🧪 [TEST UPLOAD] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      return NextResponse.json({ 
        error: 'Failed to parse form data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 413 })
    }

    const file = formData.get('file') as File | null;
    console.log('🧪 [TEST UPLOAD] File from form data:', file ? {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    } : 'No file found')

    if (!file) {
      console.log('🧪 [TEST UPLOAD] No file in form data')
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    console.log(`🧪 [TEST UPLOAD] File received: ${file.name} (${Math.round(file.size / (1024 * 1024))}MB)`)
    
    return NextResponse.json({ 
      success: true,
      message: `File received successfully: ${file.name}`,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeMB: Math.round(file.size / (1024 * 1024))
      },
      config: {
        maxDuration: 60,
        runtime: 'nodejs',
        preferredRegion: 'auto',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        platform: process.env.VERCEL ? 'Vercel' : 'Other'
      }
    })
  } catch (error) {
    console.error('🧪 [TEST UPLOAD] Error in test upload:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: `Test upload failed: ${errorMessage}`,
      details: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  console.log('🧪 [TEST UPLOAD] GET request received')
  
  return NextResponse.json({ 
    message: 'Test upload endpoint active',
    config: {
      maxDuration: 60,
      runtime: 'nodejs',
      preferredRegion: 'auto',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : 'Other'
    }
  })
} 
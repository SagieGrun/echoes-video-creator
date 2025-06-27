import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    const fullPath = join(process.cwd(), 'public', filePath)
    
    // Basic security - only allow certain file types
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp']
    const fileExtension = '.' + filePath.split('.').pop()?.toLowerCase()
    
    if (!allowedExtensions.includes(fileExtension)) {
      return new NextResponse('File type not allowed', { status: 403 })
    }
    
    // Read the file
    const fileBuffer = readFileSync(fullPath)
    
    // Set appropriate content type
    const contentTypes: { [key: string]: string } = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg', 
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp'
    }
    
    const contentType = contentTypes[fileExtension] || 'application/octet-stream'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
    
  } catch (error) {
    console.error('Error serving static file:', error)
    return new NextResponse('File not found', { status: 404 })
  }
} 
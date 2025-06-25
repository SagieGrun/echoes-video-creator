import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId

    if (!videoId) {
      return new NextResponse('Video ID is required', { status: 400 })
    }

    // Get the video record
    const { data: video, error: videoError } = await supabase
      .from('final_videos')
      .select('id, public_url, selected_clips, music_track_id, created_at, file_size')
      .eq('id', videoId)
      .eq('status', 'completed')
      .single()

    if (videoError || !video) {
      return new NextResponse('Video not found', { status: 404 })
    }

    if (!video.public_url) {
      return new NextResponse('Video not available', { status: 404 })
    }

    // Generate metadata
    const clipCount = video.selected_clips?.length || 0
    const hasMusic = !!video.music_track_id
    const fileSize = video.file_size ? `${(video.file_size / (1024 * 1024)).toFixed(1)} MB` : ''
    const createdDate = new Date(video.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const title = `Amazing Animated Video - ${clipCount} clips${hasMusic ? ' with music' : ''}`
    const description = `Check out this incredible animated video created with Echoes! ${clipCount} photos brought to life${hasMusic ? ' with music' : ''}. Created on ${createdDate}.`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://echoes.app'
    const previewUrl = `${appUrl}/preview/${videoId}`

    // Check if this is a social media crawler
    const userAgent = request.headers.get('user-agent') || ''
    const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram/i.test(userAgent)

    if (isCrawler) {
      // Return HTML with Open Graph meta tags for social media crawlers
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} | Echoes</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${previewUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:video" content="${video.public_url}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:site_name" content="Echoes">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:url" content="${previewUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:player" content="${video.public_url}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">
  
  <!-- WhatsApp -->
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">
  
  <meta name="robots" content="noindex, nofollow">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <video controls width="100%" style="max-width: 800px;">
    <source src="${video.public_url}" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <p><a href="${appUrl}">Create your own animated videos with Echoes</a></p>
</body>
</html>`

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      })
    } else {
      // For regular users, redirect to the actual video
      return NextResponse.redirect(video.public_url)
    }

  } catch (error) {
    console.error('Error in preview route:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
} 
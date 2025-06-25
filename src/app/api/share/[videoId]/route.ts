import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Get the video record
    const { data: video, error: videoError } = await supabase
      .from('final_videos')
      .select('id, file_path, status, user_id')
      .eq('id', videoId)
      .eq('status', 'completed')
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (!video.file_path) {
      return NextResponse.json({ error: 'Video file not available' }, { status: 404 })
    }

    // Generate a long-lived signed URL (24 hours)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('final-videos')
      .createSignedUrl(video.file_path, 86400) // 24 hours

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Error generating signed URL:', urlError)
      return NextResponse.json({ error: 'Failed to generate video URL' }, { status: 500 })
    }

    // For social sharing, we want to redirect directly to the video
    // This creates a permanent shareable URL that doesn't expose the signed URL structure
    return NextResponse.redirect(signedUrlData.signedUrl)

  } catch (error) {
    console.error('Error in share video route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
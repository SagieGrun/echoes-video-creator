import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth'
import { getRunwayService } from '@/lib/runway'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const clipId = params.id

    // Get clip data with project ownership check
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .select(`
        id,
        status,
        error_message,
        video_url,
        generation_job_id,
        created_at,
        completed_at,
        project_id,
        projects!inner (
          user_id
        )
      `)
      .eq('id', clipId)
      .eq('projects.user_id', user.id)
      .single()

    if (clipError || !clip) {
      return NextResponse.json(
        { error: 'Clip not found or access denied' },
        { status: 404 }
      )
    }

    // Calculate progress percentage
    let progress = 0
    switch (clip.status) {
      case 'pending':
        progress = 10
        break
      case 'processing':
        const elapsed = clip.created_at 
          ? Math.floor((Date.now() - new Date(clip.created_at).getTime()) / 1000)
          : 0
        // Estimate progress based on typical Gen-4 Turbo time (2-3 minutes)
        progress = Math.min(90, 20 + (elapsed / 180) * 70) // 20% to 90%
        break
      case 'completed':
        progress = 100
        break
      case 'failed':
        progress = 0
        break
      default:
        progress = 0
    }

    // Calculate estimated time remaining (in seconds)
    let estimated_time = 0
    if (clip.status === 'pending' || clip.status === 'processing') {
      const elapsed = clip.created_at 
        ? Math.floor((Date.now() - new Date(clip.created_at).getTime()) / 1000)
        : 0
      estimated_time = Math.max(25 - elapsed, 3) // 25 seconds total, minimum 3 seconds
    }

    return NextResponse.json({
      clip_id: clip.id,
      status: clip.status,
      progress,
      video_url: clip.video_url,
      error_message: clip.error_message,
      estimated_time,
      generation_job_id: clip.generation_job_id
    })

  } catch (error) {
    console.error('Error fetching clip status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
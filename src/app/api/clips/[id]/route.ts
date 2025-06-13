import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/lib/auth'

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

    // Get complete clip data with project ownership check
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .select(`
        id,
        project_id,
        image_url,
        video_url,
        prompt,
        status,
        generation_job_id,
        error_message,
        regen_count,
        created_at,
        completed_at,
        projects!inner (
          id,
          user_id,
          title,
          status
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

    // Transform the response to match our interface
    const project = Array.isArray(clip.projects) ? clip.projects[0] : clip.projects
    const response = {
      id: clip.id,
      project_id: clip.project_id,
      image_url: clip.image_url,
      video_url: clip.video_url,
      prompt: clip.prompt,
      status: clip.status,
      generation_job_id: clip.generation_job_id,
      error_message: clip.error_message,
      regen_count: clip.regen_count,
      created_at: clip.created_at,
      completed_at: clip.completed_at,
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching clip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/providers/base'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { photoUrl } = await request.json()

    if (!photoUrl) {
      return NextResponse.json(
        { error: 'Photo URL is required' },
        { status: 400 }
      )
    }

    // Get the configured AI provider
    const provider = await getProvider()

    // Create a new project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([
        {
          status: 'pending',
          // We'll add music_id later when implementing music selection
        }
      ])
      .select()
      .single()

    if (projectError) {
      console.error('Error creating project:', projectError)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    // Start the clip generation with the configured provider
    const jobId = await provider.generateClip(
      photoUrl,
      'Create a beautiful animated clip from this photo'
    )

    // Create a new clip associated with the project
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .insert([
        {
          project_id: project.id,
          image_url: photoUrl,
          status: 'generating',
          runway_job_id: jobId, // TODO: Make this provider-agnostic
          prompt: 'Create a beautiful animated clip from this photo'
        }
      ])
      .select()
      .single()

    if (clipError) {
      console.error('Error creating clip:', clipError)
      return NextResponse.json(
        { error: 'Failed to create clip' },
        { status: 500 }
      )
    }

    // Start polling for job status
    const pollStatus = async () => {
      try {
        const { status, result_url, error_message } = await provider.getJobStatus(jobId)
        
        // Update clip status
        const { error: updateError } = await supabase
          .from('clips')
          .update({
            status: status === 'completed' ? 'ready' : status === 'failed' ? 'error' : 'generating',
            video_url: result_url,
            error_message
          })
          .eq('id', clip.id)

        if (updateError) {
          console.error('Error updating clip status:', updateError)
        }

        // If still processing, continue polling
        if (status === 'processing' || status === 'pending') {
          setTimeout(pollStatus, 5000) // Poll every 5 seconds
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }

    // Start polling in the background
    pollStatus()

    return NextResponse.json({ clipId: clip.id })
  } catch (error) {
    console.error('Error in clip generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
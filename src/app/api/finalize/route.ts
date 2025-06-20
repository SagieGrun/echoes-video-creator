import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(request: NextRequest) {
  try {
    const { selectedClips, musicTrackId, transitionType, musicVolume } = await request.json()
    
    if (!selectedClips || selectedClips.length === 0) {
      return NextResponse.json(
        { error: 'At least one clip must be selected' },
        { status: 400 }
      )
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Save finalization settings for the user
    const { data, error } = await supabase
      .from('final_videos')
      .upsert({
        user_id: user.id,
        project_id: null, // No specific project for simplified flow
        selected_clips: selectedClips,
        music_track_id: musicTrackId || null,
        transition_type: transitionType,
        music_volume: musicVolume,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      finalVideo: data 
    })

  } catch (error) {
    console.error('Error saving finalization settings:', error)
    return NextResponse.json(
      { error: 'Failed to save finalization settings' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get finalization settings for this user
    const { data, error } = await supabase
      .from('final_videos')
      .select('*')
      .eq('user_id', user.id)
      .is('project_id', null) // For simplified flow
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ 
      finalVideo: data || null 
    })

  } catch (error) {
    console.error('Error fetching finalization settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch finalization settings' },
      { status: 500 }
    )
  }
} 
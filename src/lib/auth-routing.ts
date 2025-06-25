import { createServerClient } from '@supabase/ssr'

export async function determinePostLoginRoute(
  userId: string, 
  supabase: ReturnType<typeof createServerClient>
): Promise<string> {
  try {
    console.log('Determining post-login route for user:', userId)

    // First check for final videos - if user has any final videos, they should go to dashboard
    const { data: finalVideos, error: finalVideosError } = await supabase
      .from('final_videos')
      .select('id, status')
      .eq('user_id', userId)
      .limit(1)

    if (finalVideosError) {
      console.error('Error checking final videos for routing:', finalVideosError)
    } else if (finalVideos && finalVideos.length > 0) {
      console.log('User has final videos, routing to dashboard')
      return '/dashboard'
    }

    // Get user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)

    if (projectsError) {
      console.error('Error checking projects for routing:', projectsError)
      return '/create' // Default fallback
    }

    if (!projects || projects.length === 0) {
      console.log('User has no projects, routing to create page')
      return '/create'
    }

    // Check for ANY clips (not just completed ones) - if user has clips, show dashboard for progress
    const projectIds = projects.map((p: any) => p.id)
    const { data: anyClips, error: clipsError } = await supabase
      .from('clips')
      .select('id, status')
      .in('project_id', projectIds)
      .limit(1)

    if (clipsError) {
      console.error('Error checking clips for routing:', clipsError)
      return '/create' // Default fallback
    }

    // Route based on content existence
    if (anyClips && anyClips.length > 0) {
      console.log('User has clips, routing to dashboard')
      return '/dashboard'  // Has clips - show dashboard for progress/content
    } else {
      console.log('User has projects but no clips, routing to create page')
      return '/create'     // Has projects but no clips yet
    }
  } catch (error) {
    console.error('Error determining post-login route:', error)
    return '/create' // Default fallback
  }
} 
import { createServerClient } from '@supabase/ssr'

export async function determinePostLoginRoute(
  userId: string, 
  supabase: ReturnType<typeof createServerClient>
): Promise<string> {
  try {
    // Get user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)

    if (projectsError || !projects || projects.length === 0) {
      // No projects = new user, send to create page
      return '/create'
    }

    // Get completed clips for these projects
    const projectIds = projects.map((p: any) => p.id)
    const { data: completedClips, error: clipsError } = await supabase
      .from('clips')
      .select('id')
      .in('project_id', projectIds)
      .eq('status', 'completed')
      .not('video_url', 'is', null)

    if (clipsError) {
      console.error('Error checking clips for routing:', clipsError)
      // Default to create page if there's an error
      return '/create'
    }

    // Route based on clip history
    if (completedClips && completedClips.length > 0) {
      return '/dashboard'  // Has completed clips
    } else {
      return '/create'     // No completed clips yet
    }
  } catch (error) {
    console.error('Error determining post-login route:', error)
    return '/create' // Default fallback
  }
} 
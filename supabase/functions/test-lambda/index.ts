// Simple test function to check if edge functions are working
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== DATABASE INVESTIGATION ===')
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Investigating clips for user: ${user.id}`)

    // 1. Check for duplicate clips with same image_file_path
    const { data: allClips, error: clipsError } = await supabase
      .from('clips')
      .select(`
        id,
        project_id,
        image_file_path,
        status,
        created_at,
        updated_at,
        projects!inner(user_id)
      `)
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: false })

    if (clipsError) {
      console.error('Error fetching clips:', clipsError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${allClips?.length || 0} total clips`)

    // Group by image_file_path to find duplicates
    const pathGroups: Record<string, any[]> = {}
    allClips?.forEach(clip => {
      if (clip.image_file_path) {
        if (!pathGroups[clip.image_file_path]) {
          pathGroups[clip.image_file_path] = []
        }
        pathGroups[clip.image_file_path].push(clip)
      }
    })

    // Find duplicate groups
    const duplicates = Object.entries(pathGroups).filter(([path, clips]) => clips.length > 1)
    
    // Status inconsistencies
    const statusCounts = allClips?.reduce((acc, clip) => {
      acc[clip.status] = (acc[clip.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Recent clips (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const recentClips = allClips?.filter(clip => new Date(clip.created_at) > yesterday) || []

    const investigation = {
      summary: {
        total_clips: allClips?.length || 0,
        status_breakdown: statusCounts,
        duplicate_groups: duplicates.length,
        recent_clips_24h: recentClips.length
      },
      duplicates: duplicates.map(([path, clips]) => ({
        image_file_path: path,
        duplicate_count: clips.length,
        clips: clips.map(c => ({
          id: c.id,
          status: c.status,
          created_at: c.created_at,
          updated_at: c.updated_at
        }))
      })),
      recent_clips: recentClips.map(c => ({
        id: c.id,
        status: c.status,
        image_file_path: c.image_file_path?.split('/').pop() || 'unknown',
        created_at: c.created_at,
        updated_at: c.updated_at
      })),
      status_analysis: {
        processing_vs_completed: {
          processing: statusCounts.processing || 0,
          pending: statusCounts.pending || 0,
          completed: statusCounts.completed || 0,
          failed: statusCounts.failed || 0
        }
      }
    }

    console.log('Investigation results:', JSON.stringify(investigation, null, 2))

    return new Response(JSON.stringify(investigation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Investigation error:', error)
    return new Response(JSON.stringify({ error: 'Investigation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 
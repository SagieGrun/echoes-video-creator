import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant that helps create cinematic, emotional video clips from static photos. 

When generating video clips:
- Focus on subtle, natural movements that bring the photo to life
- Add gentle camera movements like slow pans or zooms
- Create atmospheric effects like light changes or environmental movement
- Maintain the emotional tone and story of the original photo
- Keep movements realistic and not overly dramatic
- Ensure the clip feels cinematic and professional

The goal is to transform static memories into living, breathing moments that evoke emotion and nostalgia.`

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { data, error } = await supabaseServiceRole
      .from('admin_config')
      .select('value, updated_at')
      .eq('key', 'system_prompt')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const systemPrompt = data 
      ? { prompt: data.value.prompt, updated_at: data.updated_at }
      : { prompt: DEFAULT_SYSTEM_PROMPT, updated_at: '' }
    
    return NextResponse.json({ systemPrompt })
  } catch (error) {
    console.error('Error fetching system prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system prompt' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { prompt } = await request.json()
    
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Update the system prompt
    const { error } = await supabaseServiceRole
      .from('admin_config')
      .upsert({
        key: 'system_prompt',
        value: { prompt: prompt.trim() },
        updated_at: now,
      })

    if (error) throw error

    const systemPrompt = {
      prompt: prompt.trim(),
      updated_at: now
    }

    return NextResponse.json({ success: true, systemPrompt })
  } catch (error) {
    console.error('Error updating system prompt:', error)
    return NextResponse.json(
      { error: 'Failed to update system prompt' },
      { status: 500 }
    )
  }
} 
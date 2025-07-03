import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

// Create admin_config table if it doesn't exist
const ensureAdminConfigTable = async () => {
  const { error } = await supabaseServiceRole.rpc('create_admin_config_table')
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating admin_config table:', error)
  }
}

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    await ensureAdminConfigTable()
    
    const { data, error } = await supabaseServiceRole
      .from('admin_config')
      .select('*')
      .eq('key', 'prompts')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const prompts = data?.value?.prompts || []
    
    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { name, prompt, is_default } = await request.json()
    
    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      )
    }

    // Get existing prompts
    const { data: existingData } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'prompts')
      .single()

    const existingPrompts = existingData?.value?.prompts || []
    
    // If this is set as default, remove default from others
    const updatedPrompts = is_default
      ? existingPrompts.map((p: any) => ({ ...p, is_default: false }))
      : existingPrompts

    const newPrompt = {
      id: crypto.randomUUID(),
      name,
      prompt,
      is_default: is_default || false,
      created_at: new Date().toISOString(),
    }

    updatedPrompts.push(newPrompt)

    // Update the config
    const { error } = await supabaseServiceRole
      .from('admin_config')
      .upsert({
        key: 'prompts',
        value: { prompts: updatedPrompts },
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ success: true, prompt: newPrompt })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    )
  }
} 
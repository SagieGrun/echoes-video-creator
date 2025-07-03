import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'
import { requireAdminAuth } from '@/lib/admin-auth'

const DEFAULT_PACKS = [
  {
    id: '1',
    name: 'Starter Pack',
    credits: 5,
    price_cents: 1500,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Standard Pack',
    credits: 20,
    price_cents: 4500,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Premium Pack',
    credits: 40,
    price_cents: 8000,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const id = params.id
    const updateData = await request.json()

    // Get existing config
    const { data: existingData } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    const existingPacks = existingData?.value?.packs || []
    
    // Find and update the specific pack
    const updatedPacks = existingPacks.map((pack: any) => 
      pack.id === id ? { ...pack, ...updateData } : pack
    )

    // Update the config
    const { error } = await supabaseServiceRole
      .from('admin_config')
      .upsert({
        key: 'credit_packs',
        value: { packs: updatedPacks },
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      pack: updatedPacks.find((p: any) => p.id === id) 
    })
  } catch (error) {
    console.error('Error updating credit pack:', error)
    return NextResponse.json(
      { error: 'Failed to update credit pack' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const id = params.id

    // Get existing config
    const { data: existingData } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    const existingPacks = existingData?.value?.packs || []
    
    // Remove the pack
    const updatedPacks = existingPacks.filter((pack: any) => pack.id !== id)

    // Update the config
    const { error } = await supabaseServiceRole
      .from('admin_config')
      .upsert({
        key: 'credit_packs',
        value: { packs: updatedPacks },
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credit pack:', error)
    return NextResponse.json(
      { error: 'Failed to delete credit pack' },
      { status: 500 }
    )
  }
} 
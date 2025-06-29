import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
  try {
    const id = params.id
    const updateData = await request.json()
    
    // Get existing packs
    const { data: existingData } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    const existingPacks = existingData?.value?.packs || DEFAULT_PACKS

    // Find and update the pack
    const packIndex = existingPacks.findIndex((pack: any) => pack.id === id)
    
    if (packIndex === -1) {
      return NextResponse.json(
        { error: 'Credit pack not found' },
        { status: 404 }
      )
    }

    // Update the pack
    const updatedPack = {
      ...existingPacks[packIndex],
      ...updateData,
      // Ensure proper types
      credits: updateData.credits ? parseInt(String(updateData.credits)) : existingPacks[packIndex].credits,
      price_cents: updateData.price_cents ? parseInt(String(updateData.price_cents)) : existingPacks[packIndex].price_cents,
      is_active: updateData.is_active !== undefined ? updateData.is_active : existingPacks[packIndex].is_active,
      updated_at: new Date().toISOString(),
    }

    existingPacks[packIndex] = updatedPack

    // Save back to database
    const { error } = await supabase
      .from('admin_config')
      .upsert({
        key: 'credit_packs',
        value: { packs: existingPacks },
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ success: true, pack: updatedPack })
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
  try {
    const id = params.id
    
    // Get existing packs
    const { data: existingData } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    const existingPacks = existingData?.value?.packs || DEFAULT_PACKS

    // Find the pack to delete
    const packIndex = existingPacks.findIndex((pack: any) => pack.id === id)
    
    if (packIndex === -1) {
      return NextResponse.json(
        { error: 'Credit pack not found' },
        { status: 404 }
      )
    }

    // Remove the pack
    const updatedPacks = existingPacks.filter((pack: any) => pack.id !== id)

    // Save back to database
    const { error } = await supabase
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
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

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { data, error } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const packs = data?.value?.packs || DEFAULT_PACKS
    
    return NextResponse.json({ packs })
  } catch (error) {
    console.error('Error fetching credit packs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit packs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { name, credits, price_cents, is_active, stripe_price_id } = await request.json()
    
    if (!name || !credits || !price_cents) {
      return NextResponse.json(
        { error: 'Name, credits, and price are required' },
        { status: 400 }
      )
    }

    // Get existing packs
    const { data: existingData } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    const existingPacks = existingData?.value?.packs || DEFAULT_PACKS

    const newPack = {
      id: crypto.randomUUID(),
      name,
      credits: parseInt(String(credits)),
      price_cents: parseInt(String(price_cents)),
      is_active: is_active !== false,
      stripe_price_id: stripe_price_id || undefined,
      created_at: new Date().toISOString(),
    }

    const updatedPacks = [...existingPacks, newPack]

    // Update the config
    const { error } = await supabaseServiceRole
      .from('admin_config')
      .upsert({
        key: 'credit_packs',
        value: { packs: updatedPacks },
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ success: true, pack: newPack })
  } catch (error) {
    console.error('Error creating credit pack:', error)
    return NextResponse.json(
      { error: 'Failed to create credit pack' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'

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
    
    // Only return active packs for public access
    const activePacks = packs.filter((pack: any) => pack.is_active)
    
    return NextResponse.json({ packs: activePacks })
  } catch (error) {
    console.error('Error fetching credit packs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit packs' },
      { status: 500 }
    )
  }
} 
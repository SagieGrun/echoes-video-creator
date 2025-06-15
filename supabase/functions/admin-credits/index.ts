import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreditPack {
  id: string
  name: string
  credits: number
  price_cents: number
  is_active: boolean
  stripe_price_id?: string
  created_at: string
}

interface CreateCreditPackRequest {
  name: string
  credits: number
  price_cents: number
  is_active?: boolean
  stripe_price_id?: string
}

const DEFAULT_PACKS: CreditPack[] = [
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

function createServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

Deno.serve(async (req) => {
  const requestId = Math.random().toString(36).substring(2, 15)
  
  console.log(`[ADMIN-CREDITS-${requestId}] === ADMIN CREDITS START ===`, {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }

  try {
    const serviceSupabase = createServiceSupabaseClient()

    // Extract pack ID for PUT and DELETE requests
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const packId = pathParts[pathParts.length - 1]

    // Fetch existing packs once
    const { data: configData, error: configError } = await serviceSupabase
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    if (configError && configError.code !== 'PGRST116') {
      console.error(`[ADMIN-CREDITS-${requestId}] Database error fetching packs:`, configError)
      throw configError
    }

    const existingPacks: CreditPack[] = configData?.value?.packs || DEFAULT_PACKS

    if (req.method === 'GET') {
      console.log(`[ADMIN-CREDITS-${requestId}] Step 1: Fetching credit packs`)
      
      const packs = configData?.value?.packs || DEFAULT_PACKS
      
      console.log(`[ADMIN-CREDITS-${requestId}] Returning ${packs.length} credit packs`)
      return new Response(
        JSON.stringify({ packs }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    if (req.method === 'POST') {
      console.log(`[ADMIN-CREDITS-${requestId}] Step 1: Creating new credit pack`)
      const body: CreateCreditPackRequest = await req.json()
      const { name, credits, price_cents, is_active, stripe_price_id } = body
      
      if (!name || !credits || !price_cents) {
        console.log(`[ADMIN-CREDITS-${requestId}] Missing required fields`)
        return new Response(
          JSON.stringify({ error: 'Name, credits, and price are required' }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      }

      const newPack: CreditPack = {
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
      const { error } = await serviceSupabase
        .from('admin_config')
        .upsert({
          key: 'credit_packs',
          value: { packs: updatedPacks },
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error(`[ADMIN-CREDITS-${requestId}] Failed to save credit pack:`, error)
        throw error
      }

      console.log(`[ADMIN-CREDITS-${requestId}] Credit pack created successfully:`, newPack.id)
      return new Response(
        JSON.stringify({ success: true, pack: newPack }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    if (req.method === 'PUT') {
      if (!packId) {
        return new Response(JSON.stringify({ error: 'Pack ID is required' }), { status: 400 })
      }

      console.log(`[ADMIN-CREDITS-${requestId}] Step 1: Updating credit pack ${packId}`)
      const body = await req.json()

      const updatedPacks = existingPacks.map(p => 
        p.id === packId ? { ...p, ...body, id: p.id } : p
      )

      const { error } = await serviceSupabase
        .from('admin_config')
        .upsert({
          key: 'credit_packs',
          value: { packs: updatedPacks },
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error(`[ADMIN-CREDITS-${requestId}] Failed to update pack:`, error)
        throw error
      }
      
      console.log(`[ADMIN-CREDITS-${requestId}] Pack ${packId} updated`)
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    if (req.method === 'DELETE') {
      if (!packId) {
        return new Response(JSON.stringify({ error: 'Pack ID is required' }), { status: 400 })
      }

      console.log(`[ADMIN-CREDITS-${requestId}] Step 1: Deleting credit pack ${packId}`)
      
      const updatedPacks = existingPacks.filter(p => p.id !== packId)

      const { error } = await serviceSupabase
        .from('admin_config')
        .upsert({
          key: 'credit_packs',
          value: { packs: updatedPacks },
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error(`[ADMIN-CREDITS-${requestId}] Failed to delete pack:`, error)
        throw error
      }

      console.log(`[ADMIN-CREDITS-${requestId}] Pack ${packId} deleted`)
      return new Response(JSON.stringify({ success: true }), { status: 204 })
    }

  } catch (error) {
    console.error(`[ADMIN-CREDITS-${requestId}] Error in admin credits:`, error)
    return new Response(
      JSON.stringify({ error: 'Failed to manage credit packs' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}) 
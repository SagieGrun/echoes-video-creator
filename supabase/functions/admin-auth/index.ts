import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface AuthRequest {
  password: string
}

Deno.serve(async (req) => {
  const requestId = Math.random().toString(36).substring(2, 15)
  
  console.log(`[ADMIN-AUTH-${requestId}] === ADMIN AUTH START ===`, {
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
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
    console.log(`[ADMIN-AUTH-${requestId}] Step 1: Parsing request body`)
    const body: AuthRequest = await req.json()
    const { password } = body
    
    if (!password) {
      console.log(`[ADMIN-AUTH-${requestId}] Missing password parameter`)
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`[ADMIN-AUTH-${requestId}] Step 2: Checking admin password`)
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')
    
    if (!adminPassword) {
      console.error(`[ADMIN-AUTH-${requestId}] Admin password not configured`)
      return new Response(
        JSON.stringify({ error: 'Admin password not configured' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    if (password === adminPassword) {
      console.log(`[ADMIN-AUTH-${requestId}] Authentication successful`)
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    } else {
      console.log(`[ADMIN-AUTH-${requestId}] Authentication failed - invalid password`)
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

  } catch (error) {
    console.error(`[ADMIN-AUTH-${requestId}] Error in admin authentication:`, error)
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
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
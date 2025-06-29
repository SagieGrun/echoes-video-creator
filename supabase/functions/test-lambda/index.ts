// Simple test function to check if edge functions are working
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

Deno.serve(async (req) => {
  console.log('=== EDGE FUNCTION TEST START ===')
  
  // Test basic functionality
  const timestamp = new Date().toISOString()
  console.log('Test function called at:', timestamp)
  
  // Test environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const runwayApiKey = Deno.env.get('RUNWAYML_API_SECRET')
  
  const envCheck = {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseAnonKey: !!supabaseAnonKey,
    hasRunwayApiKey: !!runwayApiKey,
    supabaseUrlLength: supabaseUrl ? supabaseUrl.length : 0,
    runwayApiKeyLength: runwayApiKey ? runwayApiKey.length : 0
  }
  
  console.log('Environment variables check:', envCheck)
  
  // Test request parsing
  let requestInfo = {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.get('Authorization'),
    contentType: req.headers.get('Content-Type')
  }
  
  console.log('Request info:', requestInfo)
  
  // Return comprehensive test results
  const response = {
    success: true,
    timestamp,
    environment: envCheck,
    request: requestInfo,
    message: 'Edge function is working!'
  }
  
  console.log('=== EDGE FUNCTION TEST END ===')
  
  return new Response(
    JSON.stringify(response, null, 2),
    { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  )
}) 
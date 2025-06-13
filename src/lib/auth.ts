import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getAuthenticatedUser() {
  const cookieStore = cookies()
  const supabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error } = await supabaseClient.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export function createAuthRequiredResponse() {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  )
} 
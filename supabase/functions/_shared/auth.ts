// Authentication utilities for Supabase Edge Functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuthenticatedUser {
  id: string
  email: string
  credit_balance: number
}

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header found')
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    })

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.log('Failed to get user from token:', userError)
      return null
    }

    // Get user profile with credit balance
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('credit_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.log('Failed to get user profile:', profileError)
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      credit_balance: profile.credit_balance
    }

  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error)
    return null
  }
}

export function createAuthenticatedSupabaseClient(token: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
}

export function createServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
} 
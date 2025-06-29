import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client (anon key - for regular operations)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Service role client (for webhooks and admin operations)
export const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceKey)

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('createSupabaseBrowserClient should only be called on the client side')
  }
  
  // Return existing client if it exists
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Create new client only if one doesn't exist
  supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)
  return supabaseClient
}

// Types for database tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          credit_balance: number
          referral_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          credit_balance?: number
          referral_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          credit_balance?: number
          referral_code?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string | null
          status: 'draft' | 'processing' | 'completed' | 'failed'
          music_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          status?: 'draft' | 'processing' | 'completed' | 'failed'
          music_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string | null
          status?: 'draft' | 'processing' | 'completed' | 'failed'
          music_id?: string | null
          updated_at?: string
        }
      }
      clips: {
        Row: {
          id: string
          project_id: string
          image_url: string
          video_url: string | null
          prompt: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          runway_job_id: string | null
          generation_job_id: string | null
          error_message: string | null
          regen_count: number
          clip_order: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          image_url: string
          video_url?: string | null
          prompt?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          runway_job_id?: string | null
          generation_job_id?: string | null
          error_message?: string | null
          regen_count?: number
          clip_order: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          video_url?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          runway_job_id?: string | null
          generation_job_id?: string | null
          error_message?: string | null
          regen_count?: number
          clip_order?: number
          completed_at?: string | null
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'purchase' | 'referral' | 'generation' | 'share'
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'purchase' | 'referral' | 'generation' | 'share'
          reference_id?: string | null
          created_at?: string
        }
        Update: never
      }
    }
  }
} 
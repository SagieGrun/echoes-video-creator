import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client
export const supabase = createClient(supabaseUrl, supabaseKey)

// Browser client for client components (singleton pattern)
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  // Only create client on browser side
  if (typeof window === 'undefined') {
    throw new Error('createSupabaseBrowserClient should only be called on the client side')
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }
  return browserClient
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
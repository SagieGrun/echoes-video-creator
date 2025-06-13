// User and Authentication Types
export interface User {
  id: string
  email: string
  credit_balance: number
  referral_code: string
  created_at: string
  updated_at: string
}

// Project and Clip Types
export interface Project {
  id: string
  user_id: string
  title?: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  music_id?: string
  created_at: string
  updated_at: string
}

export interface Clip {
  id: string
  project_id: string
  image_url: string
  video_url?: string
  prompt?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  runway_job_id?: string
  generation_job_id?: string
  error_message?: string
  regen_count: number
  clip_order: number
  created_at: string
  completed_at?: string
}

// Credit System Types
export interface CreditTransaction {
  id: string
  user_id: string
  amount: number // positive = credit, negative = debit
  type: 'purchase' | 'referral' | 'generation' | 'share'
  reference_id?: string // stripe payment id, project id, etc.
  created_at: string
}

// Payment Types
export interface Payment {
  id: string
  user_id: string
  stripe_payment_id: string
  credits_purchased: number
  amount_cents: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

// Referral Types
export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  status: 'pending' | 'completed'
  credits_awarded: number
  created_at: string
}

// AI Provider Interface
export interface AIVideoProvider {
  generateClip(imageUrl: string, prompt: string): Promise<string> // returns job ID
  getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed'
    result_url?: string
    error_message?: string
  }>
}

// UI Component Types
export interface UploadedImage {
  file: File
  preview: string
  id: string
}

export interface GenerationStatus {
  clipId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

// Pricing Types
export interface PricingTier {
  id: string
  name: string
  credits: number
  price_cents: number
  stripe_price_id: string
} 
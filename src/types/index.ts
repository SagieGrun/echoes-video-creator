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
  image_file_path: string
  video_url?: string
  video_file_path?: string
  status: 'generating' | 'ready' | 'error'
  approved: boolean
  order: number
  created_at: string
  updated_at: string
  regen_count?: number
  generation_job_id?: string
}

export interface FinalVideo {
  id: string
  user_id: string
  project_id?: string
  selected_clips: any[]
  music_track_id?: string
  transition_type: string
  music_volume: number
  output_aspect_ratio: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  file_url?: string
  file_path?: string
  total_duration?: number
  file_size?: number
  error_message?: string
  created_at: string
  completed_at?: string
}

// Credit System Types
export interface CreditTransaction {
  id: string
  user_id: string
  amount: number // positive = credit, negative = debit
  type: 'purchase' | 'referral' | 'generation' | 'share'
  reference_id?: string // gumroad sale id, project id, etc.
  created_at: string
}

// Payment Types - Updated for Gumroad
export interface Payment {
  id: string
  user_id: string
  gumroad_sale_id: string
  gumroad_product_id?: string
  gumroad_product_permalink?: string
  gumroad_order_number?: number
  buyer_email?: string
  credits_purchased: number
  amount_cents: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

export interface MusicTrack {
  id: string
  title: string
  file_path: string
  file_url: string
  duration?: number
  created_at: string
}

// Upload Types
export interface UploadResult {
  success: boolean
  imageUrl?: string
  filePath?: string
  error?: string
}

// Generation Types
export interface GenerationState {
  phase: 'upload' | 'confirm' | 'generating' | 'complete' | 'error'
  progress: number
  message: string
  clipId?: string
}

// Pricing Types
export interface PricingTier {
  id: string
  name: string
  credits: number
  price_cents: number
  gumroad_permalink?: string // Updated from stripe_price_id
}

// Admin Types
export interface AdminConfig {
  id: string
  key: string
  value: any
  created_at: string
  updated_at: string
}

// Social Sharing Types
export interface SocialShareConfig {
  platform: 'facebook' | 'instagram' | 'whatsapp'
  enabled: boolean
  share_text: string
  hashtags?: string[]
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
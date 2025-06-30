-- PLG System Migration: Enhance referrals and add share submissions
-- This migration builds on existing referral infrastructure

-- First, let's update the existing referrals table to match our PLG requirements
-- Change status column to reward_granted boolean for better tracking
ALTER TABLE public.referrals 
  DROP COLUMN IF EXISTS status,
  ADD COLUMN IF NOT EXISTS reward_granted BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN public.referrals.reward_granted IS 'True when both users have received their referral credits';

-- Create share_submissions table for one-time social sharing rewards
CREATE TABLE IF NOT EXISTS public.share_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  screenshot_url TEXT NOT NULL,
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for share_submissions
ALTER TABLE public.share_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_submissions
CREATE POLICY "Users can view their own share submissions"
  ON public.share_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own share submissions"
  ON public.share_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure only one share submission per user (prevent duplicate rewards)
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_submissions_user_id 
  ON public.share_submissions(user_id);

-- Add PLG configuration to admin_config
INSERT INTO public.admin_config (key, value) VALUES 
  ('plg_settings', '{"referral_reward_credits": 5, "share_reward_credits": 2}')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = timezone('utc'::text, now());

-- Update credit_transactions type constraint to include PLG transaction types
ALTER TABLE public.credit_transactions 
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions 
  ADD CONSTRAINT credit_transactions_type_check 
  CHECK (type IN ('purchase', 'referral', 'generation', 'share', 'referral_bonus'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_reward 
  ON public.referrals(referrer_id, reward_granted);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_reward 
  ON public.referrals(referred_id, reward_granted);

-- Create storage bucket for share screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'share-screenshots',
  'share-screenshots', 
  false,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for share-screenshots bucket
CREATE POLICY "Users can upload their own share screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'share-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own share screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'share-screenshots' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to get PLG settings (for easy access in code)
CREATE OR REPLACE FUNCTION get_plg_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings JSONB;
BEGIN
  SELECT value INTO settings 
  FROM public.admin_config 
  WHERE key = 'plg_settings';
  
  -- Return default values if not found
  IF settings IS NULL THEN
    RETURN '{"referral_reward_credits": 5, "share_reward_credits": 2}'::jsonb;
  END IF;
  
  RETURN settings;
END;
$$;

-- Function to check if user has already received share reward
CREATE OR REPLACE FUNCTION user_has_share_reward(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.share_submissions 
    WHERE user_id = user_uuid AND status = 'approved'
  );
END;
$$;

-- Function to get user's referral earnings
CREATE OR REPLACE FUNCTION get_referral_earnings(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_earnings INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_earnings
  FROM public.credit_transactions
  WHERE user_id = user_uuid 
    AND type IN ('referral', 'referral_bonus');
  
  RETURN total_earnings;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.share_submissions IS 'Tracks social media share submissions for one-time credit rewards';
COMMENT ON FUNCTION get_plg_settings() IS 'Returns current PLG reward configuration from admin settings';
COMMENT ON FUNCTION user_has_share_reward(UUID) IS 'Checks if user has already received their one-time share reward';
COMMENT ON FUNCTION get_referral_earnings(UUID) IS 'Calculates total credits earned by user through referrals'; 
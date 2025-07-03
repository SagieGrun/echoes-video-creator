-- Fix RLS policies blocking referral system
-- Two issues:
-- 1. Referral creation policy only allows referrers to create their own referrals
-- 2. Users policy blocks referrer lookup during signup process

-- Fix Issue #1: Referral creation policy
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

CREATE POLICY "Allow referral creation for authenticated users"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is the referrer (original behavior)
    auth.uid() = referrer_id 
    OR
    -- Allow if user is the referred user (for signup process)
    auth.uid() = referred_id
  );

-- Fix Issue #2: Function privileges
-- The process_referral_signup function should run with elevated privileges
-- to bypass RLS and lookup referrers by referral code

-- Ensure the function has proper privileges and ownership
-- Functions marked as SECURITY DEFINER should run with function owner's privileges
ALTER FUNCTION process_referral_signup(uuid, text) OWNER TO postgres;

-- Drop the old policy first
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Recreate the users policy (keeping original security)
CREATE POLICY "Users can view their own data" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- Add comments explaining the policies
COMMENT ON POLICY "Allow referral creation for authenticated users" ON public.referrals
IS 'Allows referral creation by either the referrer or the referred user to support both manual and automatic referral processes';

COMMENT ON POLICY "Users can view their own data" ON public.users
IS 'Allows users to see their own data only (original security maintained)'; 
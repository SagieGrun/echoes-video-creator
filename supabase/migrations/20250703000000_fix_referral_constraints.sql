-- Fix missing unique constraint for referrals table
-- The process_referral_signup function uses ON CONFLICT (referrer_id, referred_id) 
-- but there's no unique constraint on these columns

-- Add unique constraint to prevent duplicate referrals
ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referrer_referred_unique 
UNIQUE (referrer_id, referred_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT referrals_referrer_referred_unique ON public.referrals 
IS 'Ensures a user can only be referred once by the same referrer'; 
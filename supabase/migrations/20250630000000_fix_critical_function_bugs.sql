-- Fix Critical PLG Function Bugs
-- These functions have wrong column names that don't match the actual database schema

-- Fix process_referral_signup function (referred_user_id -> referred_id)
CREATE OR REPLACE FUNCTION process_referral_signup(
  new_user_id uuid,
  referrer_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id uuid;
BEGIN
  -- Only process if referrer_code is provided
  IF referrer_code IS NULL OR referrer_code = '' THEN
    RETURN '{"success": false, "reason": "no_referrer_code"}'::jsonb;
  END IF;

  -- Find the referrer by referral code
  SELECT id INTO referrer_user_id
  FROM users
  WHERE referral_code = referrer_code;
  
  -- If no referrer found, exit
  IF referrer_user_id IS NULL THEN
    RETURN '{"success": false, "reason": "invalid_referrer_code"}'::jsonb;
  END IF;
  
  -- Prevent self-referrals (ONLY anti-abuse check for MVP)
  IF referrer_user_id = new_user_id THEN
    RETURN '{"success": false, "reason": "self_referral_blocked"}'::jsonb;
  END IF;
  
  -- Create referral record (FIX: use referred_id not referred_user_id)
  INSERT INTO referrals (
    referrer_id,
    referred_id,
    reward_granted
  ) VALUES (
    referrer_user_id,
    new_user_id,
    false
  )
  ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  
  RETURN '{"success": true, "reason": "referral_created"}'::jsonb;
END;
$$;

-- Drop and recreate submit_share_for_reward function to fix parameter name
DROP FUNCTION IF EXISTS submit_share_for_reward(uuid, text);

CREATE FUNCTION submit_share_for_reward(
  target_user_id uuid,
  screenshot_url text DEFAULT 'https://echoes.video'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_submission share_submissions%ROWTYPE;
  plg_share_reward integer;
BEGIN
  -- Check if user already has an approved share submission (ONLY anti-abuse check)
  SELECT * INTO existing_submission
  FROM share_submissions
  WHERE user_id = target_user_id AND status = 'approved'
  LIMIT 1;
  
  IF existing_submission.id IS NOT NULL THEN
    RETURN '{"success": false, "reason": "already_claimed"}'::jsonb;
  END IF;
  
  -- Get share reward amount from admin config
  SELECT value::integer INTO plg_share_reward
  FROM admin_config
  WHERE key = 'plg_share_reward';
  
  IF plg_share_reward IS NULL THEN
    plg_share_reward := 2; -- Default fallback
  END IF;
  
  -- Create share submission
  INSERT INTO share_submissions (
    user_id,
    screenshot_url,
    status
  ) VALUES (
    target_user_id,
    screenshot_url,
    'approved' -- Auto-approve for honor system
  );
  
  -- Award credits immediately
  UPDATE users 
  SET credit_balance = credit_balance + plg_share_reward,
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the credit transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    type,
    reference_id
  ) VALUES (
    target_user_id,
    plg_share_reward,
    'share',
    'social_share_bonus'
  );
  
  RETURN '{"success": true, "reason": "reward_granted", "credits_awarded": ' || plg_share_reward || '}'::jsonb;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_referral_signup(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_share_for_reward(uuid, text) TO authenticated; 
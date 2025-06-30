-- Force Simple Anti-Abuse System
-- Aggressively drop all complex functions and recreate simple ones

-- Drop ALL possible versions of these functions (brute force approach)
DROP FUNCTION IF EXISTS process_referral_signup(uuid, text, inet);
DROP FUNCTION IF EXISTS process_referral_signup(uuid, text);
DROP FUNCTION IF EXISTS process_referral_signup;

DROP FUNCTION IF EXISTS submit_share_for_reward(uuid, text, inet, text);
DROP FUNCTION IF EXISTS submit_share_for_reward(uuid, text);
DROP FUNCTION IF EXISTS submit_share_for_reward;

DROP FUNCTION IF EXISTS detect_referral_abuse();

-- Drop the complex rate limiting table (if it wasn't dropped before)
DROP TABLE IF EXISTS referral_rate_limits CASCADE;

-- Remove any remaining complex columns (if they weren't removed before)
ALTER TABLE referrals 
DROP COLUMN IF EXISTS created_ip,
DROP COLUMN IF EXISTS referred_ip,
DROP COLUMN IF EXISTS is_suspicious,
DROP COLUMN IF EXISTS abuse_reason;

ALTER TABLE share_submissions
DROP COLUMN IF EXISTS submission_ip,
DROP COLUMN IF EXISTS user_agent,
DROP COLUMN IF EXISTS is_duplicate;

-- Create the simple referral function (clean slate)
CREATE FUNCTION process_referral_signup(
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
  
  -- Create referral record (simple case)
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

-- Create the simple share function (clean slate)  
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
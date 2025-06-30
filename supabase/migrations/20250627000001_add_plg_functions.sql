-- Add PLG database functions for share credit awards

-- Function to award share credits to a user
CREATE OR REPLACE FUNCTION award_share_credits(
  target_user_id uuid,
  credit_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user's credit balance
  UPDATE users 
  SET credit_balance = credit_balance + credit_amount,
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
    credit_amount,
    'share',
    'social_share_bonus'
  );
END;
$$;

-- Function to check if user has referral cookie and create referral record
CREATE OR REPLACE FUNCTION process_referral_signup(
  new_user_id uuid,
  referrer_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id uuid;
BEGIN
  -- Only process if referrer_code is provided
  IF referrer_code IS NOT NULL AND referrer_code != '' THEN
    -- Find the referrer by referral code
    SELECT id INTO referrer_user_id
    FROM users
    WHERE referral_code = referrer_code
    AND id != new_user_id; -- Don't allow self-referrals
    
    -- If referrer found, create referral record
    IF referrer_user_id IS NOT NULL THEN
      INSERT INTO referrals (
        referrer_id,
        referred_user_id,
        reward_granted
      ) VALUES (
        referrer_user_id,
        new_user_id,
        false
      )
      ON CONFLICT (referrer_id, referred_user_id) DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION award_share_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_signup(uuid, text) TO authenticated; 
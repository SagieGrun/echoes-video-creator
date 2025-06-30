-- Fix JSON syntax error in submit_share_for_reward function
CREATE OR REPLACE FUNCTION submit_share_for_reward(
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
  SET credit_balance = credit_balance + plg_share_reward
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
  
  -- FIX: Use proper JSON construction to avoid syntax errors
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'reward_granted',
    'credits_awarded', plg_share_reward
  );
END;
$$; 
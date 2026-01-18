-- Function to get user profile with automatic credit reset
-- Uses row-level locking to prevent race conditions
CREATE OR REPLACE FUNCTION get_profile_with_reset(p_user_id uuid)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile user_profiles;
  next_monday timestamptz;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT * INTO profile FROM user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check if credits need reset (reset_at has passed)
  IF profile.credits_reset_at <= NOW() THEN
    -- Calculate next Monday at midnight UTC
    next_monday := date_trunc('week', NOW() AT TIME ZONE 'UTC') + interval '1 week';

    -- Reset credits and update timestamp
    UPDATE user_profiles SET
      credits_remaining = weekly_credits_max,
      credits_reset_at = next_monday,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO profile;
  END IF;

  RETURN profile;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profile_with_reset(uuid) TO authenticated;

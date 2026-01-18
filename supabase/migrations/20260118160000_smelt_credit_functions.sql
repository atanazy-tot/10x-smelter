-- Atomic credit deduction for smelt processing
-- This function safely deducts one credit from a user's balance,
-- but only if they don't have a valid API key and have credits remaining.
CREATE OR REPLACE FUNCTION deduct_smelt_credit(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET
    credits_remaining = GREATEST(credits_remaining - 1, 0),
    updated_at = now()
  WHERE user_id = p_user_id
    AND api_key_status != 'valid'
    AND credits_remaining > 0;
END;
$$;

-- Increment anonymous usage counter for smelt processing
-- Uses upsert to handle both new and existing records for the day.
CREATE OR REPLACE FUNCTION increment_anonymous_usage(p_ip_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := current_date;
BEGIN
  INSERT INTO anonymous_usage (ip_hash, date_utc, smelts_used)
  VALUES (p_ip_hash, v_today, 1)
  ON CONFLICT (ip_hash, date_utc)
  DO UPDATE SET smelts_used = anonymous_usage.smelts_used + 1;
END;
$$;

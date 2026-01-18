-- Create anonymous smelt with SECURITY DEFINER
-- This function bypasses RLS to allow anonymous users to create smelts
-- without needing SELECT access to verify the parent smelt exists.
--
-- The function:
-- 1. Creates the smelt record with user_id = NULL
-- 2. Creates all smelt_files records
-- 3. Returns the complete smelt data as JSON
--
-- This is secure because:
-- - Anonymous users can only create, never query
-- - The function controls exactly what data is returned
-- - No risk of one anonymous user seeing another's data

CREATE OR REPLACE FUNCTION create_anonymous_smelt(
  p_mode smelt_mode,
  p_default_prompt_names default_prompt_name[],
  p_files jsonb  -- Array of {filename, size_bytes, input_type}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_smelt_id uuid;
  v_smelt_record record;
  v_files jsonb := '[]'::jsonb;
  v_file jsonb;
  v_file_record record;
  v_position int := 0;
BEGIN
  -- Create the smelt record
  INSERT INTO smelts (
    user_id,
    status,
    mode,
    default_prompt_names,
    user_prompt_id
  ) VALUES (
    NULL,  -- anonymous user
    'pending',
    p_mode,
    p_default_prompt_names,
    NULL   -- anonymous users can't use custom prompts
  )
  RETURNING * INTO v_smelt_record;

  v_smelt_id := v_smelt_record.id;

  -- Create smelt_files records
  FOR v_file IN SELECT * FROM jsonb_array_elements(p_files)
  LOOP
    INSERT INTO smelt_files (
      smelt_id,
      input_type,
      filename,
      size_bytes,
      status,
      position
    ) VALUES (
      v_smelt_id,
      (v_file->>'input_type')::input_type,
      v_file->>'filename',
      (v_file->>'size_bytes')::bigint,
      'pending',
      v_position
    )
    RETURNING * INTO v_file_record;

    -- Build file JSON
    v_files := v_files || jsonb_build_object(
      'id', v_file_record.id,
      'filename', v_file_record.filename,
      'size_bytes', v_file_record.size_bytes,
      'duration_seconds', v_file_record.duration_seconds,
      'input_type', v_file_record.input_type,
      'status', v_file_record.status,
      'position', v_file_record.position
    );

    v_position := v_position + 1;
  END LOOP;

  -- Return the complete smelt data
  RETURN jsonb_build_object(
    'id', v_smelt_record.id,
    'status', v_smelt_record.status,
    'mode', v_smelt_record.mode,
    'files', v_files,
    'default_prompt_names', to_jsonb(v_smelt_record.default_prompt_names),
    'user_prompt_id', v_smelt_record.user_prompt_id,
    'created_at', v_smelt_record.created_at,
    'subscription_channel', 'smelt:' || v_smelt_record.id::text
  );
END;
$$;

-- =============================================================================
-- migration: reorder_prompts_function
-- description: creates function for batch updating prompt positions within a section
-- affected tables: prompts
-- =============================================================================

-- Function to batch update prompt positions in a single transaction
-- Uses row-level ownership check (user_id) and section filter for security
CREATE OR REPLACE FUNCTION reorder_prompts(
  p_user_id uuid,
  p_section_id uuid,
  p_updates jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_count integer := 0;
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE prompts
    SET position = (item->>'position')::integer
    WHERE id = (item->>'id')::uuid
      AND user_id = p_user_id
      AND (
        (p_section_id IS NULL AND section_id IS NULL)
        OR section_id = p_section_id
      );

    IF FOUND THEN
      update_count := update_count + 1;
    END IF;
  END LOOP;

  RETURN update_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reorder_prompts(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION reorder_prompts(uuid, uuid, jsonb) IS
  'Batch updates positions for multiple prompts within a section owned by the specified user';

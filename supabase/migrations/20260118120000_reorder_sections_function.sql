-- =============================================================================
-- migration: reorder_sections_function
-- description: creates function for batch updating section positions
-- affected tables: prompt_sections
-- =============================================================================

-- Function to batch update section positions in a single transaction
-- Uses row-level ownership check (user_id) for security
CREATE OR REPLACE FUNCTION reorder_sections(
  p_user_id uuid,
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
    UPDATE prompt_sections
    SET position = (item->>'position')::integer
    WHERE id = (item->>'id')::uuid
      AND user_id = p_user_id;

    IF FOUND THEN
      update_count := update_count + 1;
    END IF;
  END LOOP;

  RETURN update_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reorder_sections(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION reorder_sections(uuid, jsonb) IS
  'Batch updates positions for multiple prompt sections owned by the specified user';

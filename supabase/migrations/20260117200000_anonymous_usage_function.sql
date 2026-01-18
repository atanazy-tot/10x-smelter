-- =============================================================================
-- migration: anonymous_usage_function
-- description: creates a security definer function to query anonymous usage
--              bypassing RLS for the anon role
-- =============================================================================

-- function: get_anonymous_usage
-- returns smelts_used for a given ip hash on current date
-- uses security definer to bypass RLS for anon role
create or replace function get_anonymous_usage(ip_hash_param text)
returns integer as $$
  select coalesce(
    (select smelts_used from anonymous_usage
     where ip_hash = ip_hash_param and date_utc = current_date),
    0
  );
$$ language sql security definer;

comment on function get_anonymous_usage(text) is
  'returns smelts_used for given ip hash on current date, bypasses RLS';

-- grant execute to anon and authenticated roles
grant execute on function get_anonymous_usage(text) to anon;
grant execute on function get_anonymous_usage(text) to authenticated;

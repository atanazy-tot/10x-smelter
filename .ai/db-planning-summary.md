<conversation_summary>
<decisions>

1. Create a `user_profiles` table keyed by `auth.users.id` to store `credits_remaining` and API key status fields not in auth metadata; no timestamp field required, and resets will be handled by a cron job on Mondays at midnight (UTC assumed).
2. Use a `prompts` table only for user-created prompts; default prompts are hardcoded in code and not stored in the database.
3. Model `smelts` with status, mode (`separate`/`combine`), timestamp, and errors; store selected default prompts as a list and a single nullable `user_prompt_id` for custom prompt usage.
4. Add a `smelt_files` table for per-input metadata; allow mixed input types (audio and text) per smelt and store only `input_type` plus metadata (no text content).
5. Track anonymous usage by hashed IP and date in `anonymous_usage`.
6. Store API keys in a separate table with encrypted key data and validation metadata.
7. No usage ledger; credits are incremented/decremented directly on `user_profiles` upon successful smelt completion.
8. Add constraints: prompt body length <= 4000, non-negative credits.
9. Add ordering positions for prompt sections and prompts.
10. Add enums for status and error codes on `smelts` and `smelt_files`.
11. Use `default_prompt_name[]` (string-based enum) in `smelts` for predefined prompt selection to keep it readable/debuggable.
12. Add indexes for anonymous usage and recent completed smelts.
13. Enable RLS on all tables with per-user access; system-owned data is enforced by code/enum validation rather than a DB table.
    </decisions>

<matched_recommendations>

1. Use enum-based validation for default prompt selection; store `default_prompt_name[]` in `smelts` for clarity and integrity.
2. Keep `user_prompt_id` nullable with FK to `prompts` and `on delete set null`.
3. Store only `input_type` and metadata in `smelt_files`; do not persist text content or file paths.
4. Enforce `char_length(prompts.body) <= 4000` via DB constraint.
5. Add `api_key_status` enum and `api_key_validated_at` in user profile data.
6. Enforce `credits_remaining >= 0` with a check constraint.
7. Add composite index on `anonymous_usage (ip_hash, date_utc)`.
8. Add enums for `status` and `error_code` on `smelts` and `smelt_files`.
9. Add partial index on `smelts (user_id, created_at desc) where status = 'completed'`.
10. Add `position` to prompts/sections for UI ordering.
    </matched_recommendations>

<database_planning_summary>
Main requirements:

- Use Supabase/Postgres with RLS; anonymous users have IP-based daily limits; logged-in users have weekly credits; API key users are unlimited.
- No storage of default prompts in DB; defaults are hardcoded in code and validated via enum values stored in `smelts.default_prompts`.
- Store only user-created prompts in `prompts` with 4,000-char limit.
- Preserve privacy: no persistent file paths or text content stored; only metadata.

Key entities and relationships:

- `user_profiles` (1:1 with `auth.users` via `user_id`) stores `credits_remaining`, `api_key_status`, `api_key_validated_at`, and related quota fields.
- `prompts` (many:1 to `auth.users` via `user_id`) holds user-created prompt `title`, `body`, and optional `section_id` + `position`.
- `prompt_sections` (many:1 to `auth.users`) holds user-defined sections/dividers with ordering.
- `smelts` (many:1 to `auth.users`, nullable) stores `status`, `mode`, timestamps, `error_code`, `default_prompt_name[]`, and a single nullable `user_prompt_id`.
- `smelt_files` (many:1 to `smelts`) stores per-input metadata (e.g., `input_type`, `filename`, `size_bytes`, `duration_seconds`, `status`, `error_code`).
- `anonymous_usage` keyed by `ip_hash` and `date_utc` to enforce anonymous daily limits.
- `user_api_keys` keyed by `user_id` to store encrypted key and validation metadata.

Security and scalability concerns:

- Enable RLS on all user-owned tables; allow access only when `auth.uid() = user_id`.
- For `smelts`, allow authenticated users to read/write their own rows; anonymous runs are tracked by `ip_hash` but should not be readable by authenticated users unless scoped.
- Use enums for `status` and `error_code` to standardize failures and simplify filtering.
- Add composite and partial indexes for high-frequency lookups (anonymous usage checks, recent completed smelts per user).
- Weekly credit resets handled by cron; no usage ledger required.

Unresolved or clarification items:

- Exact enum values for `default_prompt_name`, `status`, and `error_code`.
- Whether to store `weekly_credits_max` or `credits_reset_at` in `user_profiles` (implicitly suggested but not explicitly confirmed).
- RLS policy for anonymous `smelts` rows (likely insert-only with no select) needs final definition.
  </database_planning_summary>

<unresolved_issues>

1. Finalize enum value sets for `default_prompt_name`, `smelts.status`, `smelt_files.status`, and error codes.
2. Confirm whether `user_profiles` should store `weekly_credits_max` and/or `credits_reset_at` for idempotent cron resets.
3. Define exact RLS behavior for anonymous `smelts`/`smelt_files` (insert-only vs limited read via session token).
   </unresolved_issues>
   </conversation_summary>

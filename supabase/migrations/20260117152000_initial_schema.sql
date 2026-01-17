-- =============================================================================
-- migration: initial_schema
-- description: creates the complete database schema for smelt application
-- affected tables: user_profiles, user_api_keys, prompt_sections, prompts,
--                  smelts, smelt_files, anonymous_usage
-- affected enums: smelt_status, smelt_mode, smelt_error_code, smelt_file_status,
--                 smelt_file_error_code, input_type, default_prompt_name, api_key_status
-- special considerations:
--   - all tables have rls enabled
--   - trigger on auth.users creates user_profile automatically
--   - anonymous users can create smelts but cannot read them back
-- =============================================================================

-- =============================================================================
-- section 1: enum types
-- these must be created before tables that reference them
-- =============================================================================

-- smelt_status: tracks the processing stages of a smelt operation
-- flow: pending -> validating -> decoding -> transcribing -> synthesizing -> completed
-- can transition to 'failed' from any state
create type smelt_status as enum (
  'pending',
  'validating',
  'decoding',
  'transcribing',
  'synthesizing',
  'completed',
  'failed'
);

-- smelt_mode: defines how multiple files are processed
-- 'separate': each file produces its own output
-- 'combine': all files are merged into a single output
create type smelt_mode as enum (
  'separate',
  'combine'
);

-- smelt_error_code: standardized error codes for smelt operations
-- covers file validation, api, and internal errors
create type smelt_error_code as enum (
  'file_too_large',
  'invalid_format',
  'duration_exceeded',
  'corrupted_file',
  'transcription_failed',
  'synthesis_failed',
  'api_rate_limited',
  'api_quota_exhausted',
  'api_key_invalid',
  'connection_lost',
  'internal_error'
);

-- smelt_file_status: tracks the processing status of individual input files
create type smelt_file_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- smelt_file_error_code: standardized error codes for individual file processing
create type smelt_file_error_code as enum (
  'file_too_large',
  'invalid_format',
  'duration_exceeded',
  'corrupted_file',
  'transcription_failed',
  'decoding_failed'
);

-- input_type: defines the type of input for processing
create type input_type as enum (
  'audio',
  'text'
);

-- default_prompt_name: the 5 predefined prompts available to all users
-- content for these is hardcoded in the application, not stored in db
create type default_prompt_name as enum (
  'summarize',
  'action_items',
  'detailed_notes',
  'qa_format',
  'table_of_contents'
);

-- api_key_status: tracks the validation status of a user's api key
create type api_key_status as enum (
  'none',
  'pending',
  'valid',
  'invalid'
);

-- =============================================================================
-- section 2: tables
-- created in dependency order to satisfy foreign key constraints
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_profiles: extends supabase auth.users with application-specific data
-- one-to-one relationship with auth.users
-- stores credit balance and api key validation status
-- -----------------------------------------------------------------------------
create table user_profiles (
  -- primary key links directly to supabase auth
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- credit system: users get weekly credits for free processing
  credits_remaining integer not null default 5
    check (credits_remaining >= 0),
  weekly_credits_max integer not null default 5,
  credits_reset_at timestamptz not null
    default (date_trunc('week', now()) + interval '1 week'),

  -- api key status tracking (actual key stored in user_api_keys)
  api_key_status api_key_status not null default 'none',
  api_key_validated_at timestamptz,

  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- add comment describing the table
comment on table user_profiles is
  'extends auth.users with credit balance and api key status for smelt processing';

-- -----------------------------------------------------------------------------
-- user_api_keys: stores encrypted api keys for users who want unlimited processing
-- one-to-one relationship with user_profiles
-- key is encrypted before storage
-- -----------------------------------------------------------------------------
create table user_api_keys (
  -- primary key links directly to user
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- encrypted openai api key (encryption handled by application layer)
  encrypted_key text not null,

  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table user_api_keys is
  'stores encrypted openai api keys for users with byok (bring your own key)';

-- -----------------------------------------------------------------------------
-- prompt_sections: user-defined sections for organizing custom prompts
-- many-to-one relationship with auth.users
-- allows users to group their prompts into categories
-- -----------------------------------------------------------------------------
create table prompt_sections (
  id uuid primary key default gen_random_uuid(),

  -- owner of this section
  user_id uuid not null references auth.users(id) on delete cascade,

  -- section metadata
  title text not null,
  position integer not null default 0,  -- for ordering in ui

  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table prompt_sections is
  'user-defined sections for organizing custom prompts in the ui';

-- -----------------------------------------------------------------------------
-- prompts: user-created custom prompts for synthesis
-- many-to-one with auth.users, optional many-to-one with prompt_sections
-- -----------------------------------------------------------------------------
create table prompts (
  id uuid primary key default gen_random_uuid(),

  -- owner of this prompt
  user_id uuid not null references auth.users(id) on delete cascade,

  -- optional section grouping (null = uncategorized)
  section_id uuid references prompt_sections(id) on delete set null,

  -- prompt content
  title text not null,
  body text not null check (char_length(body) <= 4000),  -- max 4000 chars
  position integer not null default 0,  -- for ordering within section

  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table prompts is
  'user-created custom prompts for ai synthesis (max 4000 chars)';

-- -----------------------------------------------------------------------------
-- smelts: main processing operations table
-- many-to-one with auth.users (nullable for anonymous users)
-- represents a single processing job that may contain multiple files
-- -----------------------------------------------------------------------------
create table smelts (
  id uuid primary key default gen_random_uuid(),

  -- owner (null for anonymous users)
  user_id uuid references auth.users(id) on delete set null,

  -- processing configuration
  status smelt_status not null default 'pending',
  mode smelt_mode not null default 'separate',

  -- selected prompts: array of default prompt names + optional custom prompt
  default_prompt_names default_prompt_name[] not null default '{}',
  user_prompt_id uuid references prompts(id) on delete set null,

  -- error tracking (populated only when status = 'failed')
  error_code smelt_error_code,
  error_message text,

  -- timestamps
  created_at timestamptz not null default now(),
  completed_at timestamptz  -- set when status becomes 'completed' or 'failed'
);

comment on table smelts is
  'main processing operations - each smelt may contain multiple input files';

-- -----------------------------------------------------------------------------
-- smelt_files: individual input files/text for a smelt operation
-- many-to-one with smelts
-- stores metadata only - actual file content is never persisted
-- -----------------------------------------------------------------------------
create table smelt_files (
  id uuid primary key default gen_random_uuid(),

  -- parent smelt operation
  smelt_id uuid not null references smelts(id) on delete cascade,

  -- input metadata
  input_type input_type not null,
  filename text,              -- original filename (audio only)
  size_bytes integer,         -- file size in bytes
  duration_seconds integer,   -- audio duration (audio only)

  -- processing status for this specific file
  status smelt_file_status not null default 'pending',
  error_code smelt_file_error_code,  -- populated if status = 'failed'

  -- ordering for combine mode
  position integer not null default 0,

  -- timestamps
  created_at timestamptz not null default now(),
  completed_at timestamptz  -- when this file finishes processing
);

comment on table smelt_files is
  'input file metadata for smelt operations - content never persisted for privacy';

-- -----------------------------------------------------------------------------
-- anonymous_usage: tracks daily usage for anonymous users by hashed ip
-- composite primary key on (ip_hash, date_utc)
-- no foreign keys - standalone tracking table
-- -----------------------------------------------------------------------------
create table anonymous_usage (
  -- sha-256 hash of ip address (never store raw ip)
  ip_hash text not null,

  -- date of usage in utc
  date_utc date not null,

  -- count of smelts used on this date
  smelts_used integer not null default 1,

  -- composite primary key ensures one row per ip per day
  primary key (ip_hash, date_utc)
);

comment on table anonymous_usage is
  'tracks daily smelt usage by hashed ip for anonymous rate limiting';

-- =============================================================================
-- section 3: row level security (rls)
-- enable rls on all tables - this is required even for public tables
-- =============================================================================

alter table user_profiles enable row level security;
alter table user_api_keys enable row level security;
alter table prompt_sections enable row level security;
alter table prompts enable row level security;
alter table smelts enable row level security;
alter table smelt_files enable row level security;
alter table anonymous_usage enable row level security;

-- =============================================================================
-- section 4: rls policies
-- policies are granular: one per operation per role
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_profiles policies
-- authenticated users can view and update their own profile
-- profiles are created via trigger, so insert is service_role only
-- -----------------------------------------------------------------------------

-- authenticated: select own profile
create policy "users can view own profile"
  on user_profiles for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated: update own profile
create policy "users can update own profile"
  on user_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- service_role: insert profiles (called from trigger)
create policy "service role can insert profiles"
  on user_profiles for insert
  to service_role
  with check (true);

-- -----------------------------------------------------------------------------
-- user_api_keys policies
-- authenticated users have full crud on their own api key record
-- they can view existence but never see the decrypted key (handled by app)
-- -----------------------------------------------------------------------------

-- authenticated: select own api key record
create policy "users can view own api key"
  on user_api_keys for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated: insert own api key
create policy "users can insert own api key"
  on user_api_keys for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated: update own api key
create policy "users can update own api key"
  on user_api_keys for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated: delete own api key
create policy "users can delete own api key"
  on user_api_keys for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- prompt_sections policies
-- authenticated users have full crud on their own sections
-- -----------------------------------------------------------------------------

-- authenticated: select own sections
create policy "users can view own sections"
  on prompt_sections for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated: insert own sections
create policy "users can insert own sections"
  on prompt_sections for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated: update own sections
create policy "users can update own sections"
  on prompt_sections for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated: delete own sections
create policy "users can delete own sections"
  on prompt_sections for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- prompts policies
-- authenticated users have full crud on their own prompts
-- -----------------------------------------------------------------------------

-- authenticated: select own prompts
create policy "users can view own prompts"
  on prompts for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated: insert own prompts
create policy "users can insert own prompts"
  on prompts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated: update own prompts
create policy "users can update own prompts"
  on prompts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated: delete own prompts
create policy "users can delete own prompts"
  on prompts for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- smelts policies
-- authenticated users can view and create their own smelts
-- anonymous users can create smelts (insert only, no read back)
-- service_role handles status updates during processing
-- -----------------------------------------------------------------------------

-- authenticated: select own smelts
create policy "users can view own smelts"
  on smelts for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated: insert own smelts
create policy "users can insert own smelts"
  on smelts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- anon: insert smelts with null user_id only
-- anonymous users can create smelts but cannot read them back
-- results are delivered via websocket and are ephemeral
create policy "anonymous can insert smelts"
  on smelts for insert
  to anon
  with check (user_id is null);

-- service_role: update smelts (for processing status updates)
create policy "service role can update smelts"
  on smelts for update
  to service_role
  using (true)
  with check (true);

-- service_role: select all smelts (for processing)
create policy "service role can read all smelts"
  on smelts for select
  to service_role
  using (true);

-- -----------------------------------------------------------------------------
-- smelt_files policies
-- access controlled via parent smelt ownership
-- authenticated users can view/insert files for their own smelts
-- anonymous users can insert files for anonymous smelts
-- service_role handles processing updates
-- -----------------------------------------------------------------------------

-- authenticated: select files for own smelts
create policy "users can view own smelt files"
  on smelt_files for select
  to authenticated
  using (
    exists (
      select 1 from smelts
      where smelts.id = smelt_files.smelt_id
      and smelts.user_id = auth.uid()
    )
  );

-- authenticated: insert files for own smelts
create policy "users can insert own smelt files"
  on smelt_files for insert
  to authenticated
  with check (
    exists (
      select 1 from smelts
      where smelts.id = smelt_files.smelt_id
      and smelts.user_id = auth.uid()
    )
  );

-- anon: insert files for anonymous smelts only
create policy "anonymous can insert smelt files"
  on smelt_files for insert
  to anon
  with check (
    exists (
      select 1 from smelts
      where smelts.id = smelt_files.smelt_id
      and smelts.user_id is null
    )
  );

-- service_role: update smelt files (for processing status)
create policy "service role can update smelt files"
  on smelt_files for update
  to service_role
  using (true)
  with check (true);

-- service_role: select all smelt files (for processing)
create policy "service role can read all smelt files"
  on smelt_files for select
  to service_role
  using (true);

-- -----------------------------------------------------------------------------
-- anonymous_usage policies
-- no direct user access - managed entirely by service_role
-- this table tracks rate limiting for anonymous users
-- -----------------------------------------------------------------------------

-- service_role: full access for managing anonymous usage
create policy "service role manages anonymous usage"
  on anonymous_usage for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- section 5: functions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- handle_new_user: automatically creates a user_profile when a user signs up
-- triggered by insert on auth.users
-- uses security definer to run with elevated privileges
-- -----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, credits_reset_at)
  values (
    new.id,
    date_trunc('week', now()) + interval '1 week'
  );
  return new;
end;
$$ language plpgsql security definer;

comment on function handle_new_user() is
  'automatically creates user_profile when user signs up via supabase auth';

-- -----------------------------------------------------------------------------
-- update_updated_at_column: sets updated_at to current timestamp
-- used by multiple tables to track last modification time
-- -----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function update_updated_at_column() is
  'generic trigger function to auto-update updated_at timestamp';

-- =============================================================================
-- section 6: triggers
-- =============================================================================

-- trigger: create user_profile on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- triggers: auto-update updated_at on relevant tables
create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_user_api_keys_updated_at
  before update on user_api_keys
  for each row execute function update_updated_at_column();

create trigger update_prompt_sections_updated_at
  before update on prompt_sections
  for each row execute function update_updated_at_column();

create trigger update_prompts_updated_at
  before update on prompts
  for each row execute function update_updated_at_column();

-- =============================================================================
-- section 7: indexes
-- performance indexes for common query patterns
-- =============================================================================

-- prompt ordering within user library (for prompt list ui)
create index idx_prompts_user_section_position
  on prompts (user_id, section_id, position);

-- section ordering within user library
create index idx_prompt_sections_user_position
  on prompt_sections (user_id, position);

-- fast lookup of recent completed smelts per user (for history/analytics)
-- partial index only includes completed smelts for efficiency
create index idx_smelts_user_completed
  on smelts (user_id, created_at desc)
  where status = 'completed';

-- smelt files by parent smelt with ordering (for combine mode)
create index idx_smelt_files_smelt_position
  on smelt_files (smelt_id, position);

-- =============================================================================
-- end of migration
-- =============================================================================

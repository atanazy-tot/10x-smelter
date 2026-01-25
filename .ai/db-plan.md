# SMELT Database Schema

## 1. Enums

### smelt_status

Tracks the processing stages of a smelt operation.

```sql
CREATE TYPE smelt_status AS ENUM (
  'pending',
  'validating',
  'decoding',
  'transcribing',
  'synthesizing',
  'completed',
  'failed'
);
```

### smelt_mode

Defines how multiple files are processed.

```sql
CREATE TYPE smelt_mode AS ENUM (
  'separate',
  'combine'
);
```

### smelt_error_code

Standardized error codes for smelt operations.

```sql
CREATE TYPE smelt_error_code AS ENUM (
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
```

### smelt_file_status

Tracks the processing status of individual input files.

```sql
CREATE TYPE smelt_file_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);
```

### smelt_file_error_code

Standardized error codes for individual file processing.

```sql
CREATE TYPE smelt_file_error_code AS ENUM (
  'file_too_large',
  'invalid_format',
  'duration_exceeded',
  'corrupted_file',
  'transcription_failed',
  'decoding_failed'
);
```

### input_type

Defines the type of input for processing.

```sql
CREATE TYPE input_type AS ENUM (
  'audio',
  'text'
);
```

### default_prompt_name

The 5 predefined prompts available to all users (content hardcoded in application).

```sql
CREATE TYPE default_prompt_name AS ENUM (
  'summarize',
  'action_items',
  'detailed_notes',
  'qa_format',
  'table_of_contents'
);
```

### api_key_status

Tracks the validation status of a user's API key.

```sql
CREATE TYPE api_key_status AS ENUM (
  'none',
  'pending',
  'valid',
  'invalid'
);
```

---

## 2. Tables

### user_profiles

Extends Supabase auth.users with application-specific data. One-to-one relationship with auth.users.

| Column               | Type           | Constraints                                              | Description                     |
| -------------------- | -------------- | -------------------------------------------------------- | ------------------------------- |
| user_id              | uuid           | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | Links to Supabase auth          |
| credits_remaining    | integer        | NOT NULL DEFAULT 5, CHECK (credits_remaining >= 0)       | Current weekly credit balance   |
| weekly_credits_max   | integer        | NOT NULL DEFAULT 5                                       | Maximum credits per week        |
| credits_reset_at     | timestamptz    | NOT NULL                                                 | Next credit reset timestamp     |
| api_key_status       | api_key_status | NOT NULL DEFAULT 'none'                                  | Status of user's API key        |
| api_key_validated_at | timestamptz    | NULL                                                     | When API key was last validated |
| created_at           | timestamptz    | NOT NULL DEFAULT now()                                   | Profile creation timestamp      |
| updated_at           | timestamptz    | NOT NULL DEFAULT now()                                   | Last update timestamp           |

```sql
CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL DEFAULT 5 CHECK (credits_remaining >= 0),
  weekly_credits_max integer NOT NULL DEFAULT 5,
  credits_reset_at timestamptz NOT NULL DEFAULT (date_trunc('week', now()) + interval '1 week'),
  api_key_status api_key_status NOT NULL DEFAULT 'none',
  api_key_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

### user_api_keys

Stores encrypted API keys for users who want unlimited processing. One-to-one with user_profiles.

| Column        | Type        | Constraints                                              | Description              |
| ------------- | ----------- | -------------------------------------------------------- | ------------------------ |
| user_id       | uuid        | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | Links to user            |
| encrypted_key | text        | NOT NULL                                                 | Encrypted OpenAI API key |
| created_at    | timestamptz | NOT NULL DEFAULT now()                                   | Key creation timestamp   |
| updated_at    | timestamptz | NOT NULL DEFAULT now()                                   | Last update timestamp    |

```sql
CREATE TABLE user_api_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

### prompt_sections

User-defined sections/dividers for organizing custom prompts. Many-to-one with auth.users.

| Column     | Type        | Constraints                                           | Description                |
| ---------- | ----------- | ----------------------------------------------------- | -------------------------- |
| id         | uuid        | PRIMARY KEY DEFAULT gen_random_uuid()                 | Unique section identifier  |
| user_id    | uuid        | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the section       |
| title      | text        | NOT NULL                                              | Section display name       |
| position   | integer     | NOT NULL DEFAULT 0                                    | Order position in UI       |
| created_at | timestamptz | NOT NULL DEFAULT now()                                | Section creation timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now()                                | Last update timestamp      |

```sql
CREATE TABLE prompt_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

### prompts

User-created custom prompts. Many-to-one with auth.users, optional many-to-one with prompt_sections.

| Column     | Type        | Constraints                                             | Description                     |
| ---------- | ----------- | ------------------------------------------------------- | ------------------------------- |
| id         | uuid        | PRIMARY KEY DEFAULT gen_random_uuid()                   | Unique prompt identifier        |
| user_id    | uuid        | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE   | Owner of the prompt             |
| section_id | uuid        | NULL, REFERENCES prompt_sections(id) ON DELETE SET NULL | Optional section grouping       |
| title      | text        | NOT NULL                                                | Prompt display name             |
| body       | text        | NOT NULL, CHECK (char_length(body) <= 4000)             | Prompt content (max 4000 chars) |
| position   | integer     | NOT NULL DEFAULT 0                                      | Order position within section   |
| created_at | timestamptz | NOT NULL DEFAULT now()                                  | Prompt creation timestamp       |
| updated_at | timestamptz | NOT NULL DEFAULT now()                                  | Last update timestamp           |

```sql
CREATE TABLE prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid REFERENCES prompt_sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL CHECK (char_length(body) <= 4000),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

### smelts

Main processing operations table. Many-to-one with auth.users (nullable for anonymous).

| Column               | Type                  | Constraints                                        | Description                     |
| -------------------- | --------------------- | -------------------------------------------------- | ------------------------------- |
| id                   | uuid                  | PRIMARY KEY DEFAULT gen_random_uuid()              | Unique smelt identifier         |
| user_id              | uuid                  | NULL, REFERENCES auth.users(id) ON DELETE SET NULL | Owner (null for anonymous)      |
| status               | smelt_status          | NOT NULL DEFAULT 'pending'                         | Current processing status       |
| mode                 | smelt_mode            | NOT NULL DEFAULT 'separate'                        | Processing mode                 |
| default_prompt_names | default_prompt_name[] | NOT NULL DEFAULT '{}'                              | Selected predefined prompts     |
| user_prompt_id       | uuid                  | NULL, REFERENCES prompts(id) ON DELETE SET NULL    | Selected custom prompt          |
| error_code           | smelt_error_code      | NULL                                               | Error code if failed            |
| error_message        | text                  | NULL                                               | Human-readable error details    |
| created_at           | timestamptz           | NOT NULL DEFAULT now()                             | Smelt initiation timestamp      |
| completed_at         | timestamptz           | NULL                                               | Processing completion timestamp |

```sql
CREATE TABLE smelts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status smelt_status NOT NULL DEFAULT 'pending',
  mode smelt_mode NOT NULL DEFAULT 'separate',
  default_prompt_names default_prompt_name[] NOT NULL DEFAULT '{}',
  user_prompt_id uuid REFERENCES prompts(id) ON DELETE SET NULL,
  error_code smelt_error_code,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
```

---

### smelt_files

Individual input files/text for a smelt operation. Many-to-one with smelts.

| Column           | Type                  | Constraints                                       | Description                     |
| ---------------- | --------------------- | ------------------------------------------------- | ------------------------------- |
| id               | uuid                  | PRIMARY KEY DEFAULT gen_random_uuid()             | Unique file identifier          |
| smelt_id         | uuid                  | NOT NULL, REFERENCES smelts(id) ON DELETE CASCADE | Parent smelt operation          |
| input_type       | input_type            | NOT NULL                                          | Type of input (audio/text)      |
| filename         | text                  | NULL                                              | Original filename (audio only)  |
| size_bytes       | integer               | NULL                                              | File size in bytes              |
| duration_seconds | integer               | NULL                                              | Audio duration (audio only)     |
| status           | smelt_file_status     | NOT NULL DEFAULT 'pending'                        | Processing status               |
| error_code       | smelt_file_error_code | NULL                                              | Error code if failed            |
| position         | integer               | NOT NULL DEFAULT 0                                | Order for combine mode          |
| created_at       | timestamptz           | NOT NULL DEFAULT now()                            | Record creation timestamp       |
| completed_at     | timestamptz           | NULL                                              | Processing completion timestamp |

```sql
CREATE TABLE smelt_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smelt_id uuid NOT NULL REFERENCES smelts(id) ON DELETE CASCADE,
  input_type input_type NOT NULL,
  filename text,
  size_bytes integer,
  duration_seconds integer,
  status smelt_file_status NOT NULL DEFAULT 'pending',
  error_code smelt_file_error_code,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
```

---

### anonymous_usage

Tracks daily usage for anonymous users by hashed IP address.

| Column      | Type    | Constraints        | Description                   |
| ----------- | ------- | ------------------ | ----------------------------- |
| ip_hash     | text    | NOT NULL           | SHA-256 hash of IP address    |
| date_utc    | date    | NOT NULL           | Date of usage (UTC)           |
| smelts_used | integer | NOT NULL DEFAULT 1 | Number of smelts on this date |

```sql
CREATE TABLE anonymous_usage (
  ip_hash text NOT NULL,
  date_utc date NOT NULL,
  smelts_used integer NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, date_utc)
);
```

---

## 3. Relationships

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │───────│  user_profiles  │
│      (PK)       │  1:1  │     (FK)        │
└─────────────────┘       └─────────────────┘
         │                        │
         │                        │
         │ 1:1                    │
         ▼                        │
┌─────────────────┐               │
│  user_api_keys  │               │
│     (FK)        │               │
└─────────────────┘               │
         │                        │
         │                        │
         │ 1:N                    │
         ▼                        │
┌─────────────────┐               │
│ prompt_sections │◄──────────────┘
│     (FK)        │       1:N
└─────────────────┘
         │
         │ 1:N (optional)
         ▼
┌─────────────────┐       ┌─────────────────┐
│    prompts      │───────│    smelts       │
│     (FK)        │  N:1  │  (nullable FK)  │
└─────────────────┘       └─────────────────┘
                                  │
                                  │ 1:N
                                  ▼
                          ┌─────────────────┐
                          │  smelt_files    │
                          │     (FK)        │
                          └─────────────────┘

┌─────────────────┐
│ anonymous_usage │  (standalone, no FK)
│   (composite PK)│
└─────────────────┘
```

### Relationship Summary

| Parent Table    | Child Table     | Cardinality    | FK Column      | On Delete |
| --------------- | --------------- | -------------- | -------------- | --------- |
| auth.users      | user_profiles   | 1:1            | user_id        | CASCADE   |
| auth.users      | user_api_keys   | 1:1            | user_id        | CASCADE   |
| auth.users      | prompt_sections | 1:N            | user_id        | CASCADE   |
| auth.users      | prompts         | 1:N            | user_id        | CASCADE   |
| auth.users      | smelts          | 1:N (nullable) | user_id        | SET NULL  |
| prompt_sections | prompts         | 1:N (optional) | section_id     | SET NULL  |
| prompts         | smelts          | 1:N (optional) | user_prompt_id | SET NULL  |
| smelts          | smelt_files     | 1:N            | smelt_id       | CASCADE   |

---

## 4. Indexes

### Performance Indexes

```sql
-- Prompt ordering within user library
CREATE INDEX idx_prompts_user_section_position
  ON prompts (user_id, section_id, position);

-- Section ordering within user library
CREATE INDEX idx_prompt_sections_user_position
  ON prompt_sections (user_id, position);

-- Fast lookup of recent completed smelts per user (for analytics/history)
CREATE INDEX idx_smelts_user_completed
  ON smelts (user_id, created_at DESC)
  WHERE status = 'completed';

-- Smelt files by parent smelt (already covered by FK, but explicit for ordering)
CREATE INDEX idx_smelt_files_smelt_position
  ON smelt_files (smelt_id, position);

-- Anonymous usage lookup (composite PK serves as index, but explicit for clarity)
-- Note: PRIMARY KEY (ip_hash, date_utc) already creates this index
```

---

## 5. Row-Level Security (RLS) Policies

### Enable RLS on All Tables

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE smelts ENABLE ROW LEVEL SECURITY;
ALTER TABLE smelt_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_usage ENABLE ROW LEVEL SECURITY;
```

### user_profiles Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profile is created via trigger on auth.users insert
-- Service role handles inserts
CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### user_api_keys Policies

```sql
-- Users can view their own API key record (not the decrypted key)
CREATE POLICY "Users can view own api key"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own API key
CREATE POLICY "Users can insert own api key"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API key
CREATE POLICY "Users can update own api key"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API key
CREATE POLICY "Users can delete own api key"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### prompt_sections Policies

```sql
-- Users can view their own sections
CREATE POLICY "Users can view own sections"
  ON prompt_sections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own sections
CREATE POLICY "Users can insert own sections"
  ON prompt_sections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sections
CREATE POLICY "Users can update own sections"
  ON prompt_sections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sections
CREATE POLICY "Users can delete own sections"
  ON prompt_sections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### prompts Policies

```sql
-- Users can view their own prompts
CREATE POLICY "Users can view own prompts"
  ON prompts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own prompts
CREATE POLICY "Users can insert own prompts"
  ON prompts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own prompts
CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own prompts
CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### smelts Policies

```sql
-- Authenticated users can view their own smelts
CREATE POLICY "Users can view own smelts"
  ON smelts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can create smelts for themselves
CREATE POLICY "Users can insert own smelts"
  ON smelts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anonymous users can create smelts (insert only, no read)
CREATE POLICY "Anonymous can insert smelts"
  ON smelts FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Service role handles status updates during processing
CREATE POLICY "Service role can update smelts"
  ON smelts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can read all smelts for processing
CREATE POLICY "Service role can read all smelts"
  ON smelts FOR SELECT
  TO service_role
  USING (true);
```

### smelt_files Policies

```sql
-- Users can view files for their own smelts
CREATE POLICY "Users can view own smelt files"
  ON smelt_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM smelts
      WHERE smelts.id = smelt_files.smelt_id
      AND smelts.user_id = auth.uid()
    )
  );

-- Users can insert files for their own smelts
CREATE POLICY "Users can insert own smelt files"
  ON smelt_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM smelts
      WHERE smelts.id = smelt_files.smelt_id
      AND smelts.user_id = auth.uid()
    )
  );

-- Anonymous users can insert files for anonymous smelts
CREATE POLICY "Anonymous can insert smelt files"
  ON smelt_files FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM smelts
      WHERE smelts.id = smelt_files.smelt_id
      AND smelts.user_id IS NULL
    )
  );

-- Service role handles status updates during processing
CREATE POLICY "Service role can update smelt files"
  ON smelt_files FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can read all smelt files for processing
CREATE POLICY "Service role can read all smelt files"
  ON smelt_files FOR SELECT
  TO service_role
  USING (true);
```

### anonymous_usage Policies

```sql
-- No direct user access - handled by service role only
-- Anonymous usage is managed by backend/service role

CREATE POLICY "Service role manages anonymous usage"
  ON anonymous_usage FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 6. Triggers and Functions

### Auto-create user_profile on signup

```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, credits_reset_at)
  VALUES (
    NEW.id,
    date_trunc('week', now()) + interval '1 week'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Auto-update updated_at timestamp

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_sections_updated_at
  BEFORE UPDATE ON prompt_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 7. Additional Notes

### Design Decisions

1. **Default prompts not stored in DB**: The 5 predefined prompts are hardcoded in the application code. The `default_prompt_name` enum ensures type safety when referencing them in `smelts.default_prompt_names[]`.

2. **Encrypted API keys in separate table**: API keys are stored encrypted in `user_api_keys` rather than in `user_profiles` to maintain separation of concerns and allow for potential future key rotation without touching the main profile.

3. **No text content storage**: For privacy, `smelt_files` only stores metadata (filename, size, duration, type). Actual text content and file data are processed in memory and never persisted.

4. **Anonymous smelts are insert-only**: Anonymous users can create smelts but cannot read them back. Results are delivered via WebSocket and ephemeral.

5. **Credit system without ledger**: Credits are directly incremented/decremented on `user_profiles.credits_remaining`. This simplifies the design while meeting MVP requirements. A ledger can be added later if audit trails are needed.

6. **Weekly reset handled by cron**: The `credits_reset_at` field enables idempotent weekly resets via a scheduled job that runs every Monday at midnight UTC.

7. **Soft reference preservation**: When a user deletes a custom prompt, `smelts.user_prompt_id` is set to NULL rather than cascading, preserving the smelt history.

### Constraints Summary

| Table           | Constraint                       | Purpose                     |
| --------------- | -------------------------------- | --------------------------- |
| user_profiles   | credits_remaining >= 0           | Prevent negative credits    |
| prompts         | char_length(body) <= 4000        | Enforce prompt length limit |
| anonymous_usage | composite PK (ip_hash, date_utc) | Unique daily usage per IP   |

### Future Considerations

- **Usage ledger**: If detailed credit history is needed, add a `credit_transactions` table.
- **Prompt versioning**: If prompt history is needed, add versioning to the `prompts` table.
- **Result storage**: If users need to access past results, add a `smelt_results` table with appropriate retention policies.
- **Rate limiting table**: If more granular rate limiting is needed beyond credits, add a dedicated rate limiting table.

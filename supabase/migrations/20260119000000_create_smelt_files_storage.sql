-- =============================================================================
-- migration: create_smelt_files_storage
-- description: creates supabase storage bucket for smelt file uploads and results
-- affected objects: storage.buckets, storage.objects policies
-- special considerations:
--   - bucket is private (not public)
--   - rls policies use smelts table for ownership verification
--   - service_role has full access for background processing
--   - authenticated users can only access files for their own smelts
--   - anonymous users cannot access storage (files processed ephemerally)
-- =============================================================================

-- =============================================================================
-- section 1: create storage bucket
-- =============================================================================

-- create the smelt-files bucket for storing audio files and processing results
-- file_size_limit: 26214400 bytes = 25 MB (per PRD requirements)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'smelt-files',
  'smelt-files',
  false,  -- private bucket
  26214400,  -- 25 MB limit
  array[
    -- audio formats
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
    'audio/ogg',
    'audio/flac',
    'audio/x-flac',
    'audio/aac',
    'audio/x-aac',
    'audio/webm',
    -- text formats (for text input and results)
    'text/plain',
    'text/markdown',
    'application/octet-stream'  -- fallback for unknown types
  ]
);

-- =============================================================================
-- section 2: helper function for rls
-- created in public schema where we have permissions
-- =============================================================================

-- helper function to extract smelt_id from storage path
-- path format: {smelt_id}/{filename} or {smelt_id}/results/{filename}
create or replace function public.get_smelt_id_from_path(path text)
returns uuid as $$
begin
  -- extract first path segment (smelt_id)
  return (string_to_array(path, '/'))[1]::uuid;
exception
  when others then
    return null;
end;
$$ language plpgsql stable security definer;

comment on function public.get_smelt_id_from_path(text) is
  'extracts smelt_id (uuid) from storage object path for rls authorization';

-- =============================================================================
-- section 3: rls policies for storage.objects
-- storage uses folder structure: {smelt_id}/{file_id}.{ext}
-- results stored in: {smelt_id}/results/{file_id}.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- service_role policies: full access for background processing
-- the processing pipeline runs with service_role to bypass rls
-- -----------------------------------------------------------------------------

-- service_role: can upload files to any smelt folder
create policy "service role can upload smelt files"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'smelt-files');

-- service_role: can read any smelt files
create policy "service role can read smelt files"
  on storage.objects for select
  to service_role
  using (bucket_id = 'smelt-files');

-- service_role: can update/overwrite smelt files (for results)
create policy "service role can update smelt files"
  on storage.objects for update
  to service_role
  using (bucket_id = 'smelt-files')
  with check (bucket_id = 'smelt-files');

-- service_role: can delete smelt files (for cleanup)
create policy "service role can delete smelt files"
  on storage.objects for delete
  to service_role
  using (bucket_id = 'smelt-files');

-- -----------------------------------------------------------------------------
-- authenticated user policies: access only their own smelt files
-- uses smelts table to verify ownership via user_id
-- folder structure: first path segment is smelt_id
-- -----------------------------------------------------------------------------

-- authenticated: can upload files to their own smelt folders
create policy "users can upload to own smelt folders"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'smelt-files'
    and exists (
      select 1 from public.smelts
      where smelts.id = public.get_smelt_id_from_path(name)
      and smelts.user_id = auth.uid()
    )
  );

-- authenticated: can read files from their own smelt folders
create policy "users can read own smelt files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'smelt-files'
    and exists (
      select 1 from public.smelts
      where smelts.id = public.get_smelt_id_from_path(name)
      and smelts.user_id = auth.uid()
    )
  );

-- authenticated: can delete files from their own smelt folders
create policy "users can delete own smelt files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'smelt-files'
    and exists (
      select 1 from public.smelts
      where smelts.id = public.get_smelt_id_from_path(name)
      and smelts.user_id = auth.uid()
    )
  );

-- =============================================================================
-- end of migration
-- =============================================================================

-- Create a new storage bucket for health records
insert into storage.buckets (id, name, public)
values ('health-records', 'health-records', true);

-- Policy to allow public access to images (simplification for MVP, ideal is authenticated)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'health-records' );

-- Policy to allow authenticated users to upload
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'health-records' AND auth.role() = 'authenticated' );

-- Policy to allow users to update their own files (optional)
create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'health-records' AND auth.role() = 'authenticated' );

-- Policy to allow users to delete their own files (optional)
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'health-records' AND auth.role() = 'authenticated' );

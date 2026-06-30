insert into storage.buckets (id, name, public)
values
  ('resumes', 'resumes', false),
  ('licenses', 'licenses', false),
  ('government-ids', 'government-ids', false),
  ('certifications', 'certifications', false),
  ('voice-interviews', 'voice-interviews', false)
on conflict (id) do nothing;

drop policy if exists "Public can upload resumes" on storage.objects;
create policy "Public can upload resumes"
  on storage.objects for insert
  with check (bucket_id = 'resumes');

drop policy if exists "Public can upload licenses" on storage.objects;
create policy "Public can upload licenses"
  on storage.objects for insert
  with check (bucket_id = 'licenses');

drop policy if exists "Public can upload government ids" on storage.objects;
create policy "Public can upload government ids"
  on storage.objects for insert
  with check (bucket_id = 'government-ids');

drop policy if exists "Public can upload certifications" on storage.objects;
create policy "Public can upload certifications"
  on storage.objects for insert
  with check (bucket_id = 'certifications');

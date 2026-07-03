drop policy if exists "Public can read voice interviews for demo" on voice_interviews;
create policy "Public can read voice interviews for demo"
  on voice_interviews for select
  using (true);

drop policy if exists "Public can create voice interviews for demo" on voice_interviews;
create policy "Public can create voice interviews for demo"
  on voice_interviews for insert
  with check (true);

drop policy if exists "Public can update voice interviews for demo" on voice_interviews;
create policy "Public can update voice interviews for demo"
  on voice_interviews for update
  using (true)
  with check (true);

drop policy if exists "Public can read interview schedules for demo" on interview_schedules;
create policy "Public can read interview schedules for demo"
  on interview_schedules for select
  using (true);

drop policy if exists "Public can create interview schedules for demo" on interview_schedules;
create policy "Public can create interview schedules for demo"
  on interview_schedules for insert
  with check (true);

drop policy if exists "Public can update interview schedules for demo" on interview_schedules;
create policy "Public can update interview schedules for demo"
  on interview_schedules for update
  using (true)
  with check (true);

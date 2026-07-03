drop policy if exists "Public can read candidate scores for demo" on candidate_scores;
create policy "Public can read candidate scores for demo"
  on candidate_scores for select
  using (true);

drop policy if exists "Public can create candidate scores" on candidate_scores;
create policy "Public can create candidate scores"
  on candidate_scores for insert
  with check (true);

drop policy if exists "Public can update candidate scores for demo" on candidate_scores;
create policy "Public can update candidate scores for demo"
  on candidate_scores for update
  using (true)
  with check (true);

drop policy if exists "Public can read ai recommendations for demo" on ai_recommendations;
create policy "Public can read ai recommendations for demo"
  on ai_recommendations for select
  using (true);

drop policy if exists "Public can create ai recommendations" on ai_recommendations;
create policy "Public can create ai recommendations"
  on ai_recommendations for insert
  with check (true);

drop policy if exists "Public can update ai recommendations for demo" on ai_recommendations;
create policy "Public can update ai recommendations for demo"
  on ai_recommendations for update
  using (true)
  with check (true);

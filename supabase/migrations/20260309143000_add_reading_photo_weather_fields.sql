alter table public.readings
  add column if not exists session text,
  add column if not exists pair text,
  add column if not exists time_zone text,
  add column if not exists track_date text,
  add column if not exists left_photo_path text,
  add column if not exists right_photo_path text,
  add column if not exists weather_ts timestamptz,
  add column if not exists temp_f double precision,
  add column if not exists humidity_pct double precision,
  add column if not exists baro_inhg double precision,
  add column if not exists adr double precision,
  add column if not exists correction double precision,
  add column if not exists davis_uv_index double precision;

update public.readings
set track_date = coalesce(track_date, nullif(date, ''))
where track_date is null;

insert into storage.buckets (id, name, public)
values ('reading-photos', 'reading-photos', false)
on conflict (id) do nothing;

-- Storage policies for lane photos
DROP POLICY IF EXISTS "Team members can view reading photos" ON storage.objects;
DROP POLICY IF EXISTS "Team members can upload reading photos" ON storage.objects;
DROP POLICY IF EXISTS "Team members can update reading photos" ON storage.objects;
DROP POLICY IF EXISTS "Team members can delete reading photos" ON storage.objects;

create policy "Team members can view reading photos"  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'reading-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can upload reading photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reading-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can update reading photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'reading-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'reading-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can delete reading photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'reading-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );


create table if not exists public.track_photos (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null,
  timestamp bigint not null,
  track_date text not null,
  time_label text not null,
  time_zone text,
  created_at timestamptz not null default now()
);

create index if not exists track_photos_track_id_timestamp_idx
  on public.track_photos (track_id, timestamp desc);

alter table public.track_photos enable row level security;

drop policy if exists "Team members can view track photos" on public.track_photos;
drop policy if exists "Team members can insert track photos" on public.track_photos;
drop policy if exists "Team members can update track photos" on public.track_photos;
drop policy if exists "Team members can delete track photos" on public.track_photos;

create policy "Team members can view track photos"
  on public.track_photos for select
  to authenticated
  using (
    exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can insert track photos"
  on public.track_photos for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can update track photos"
  on public.track_photos for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can delete track photos"
  on public.track_photos for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('track-photos', 'track-photos', false)
on conflict (id) do nothing;

drop policy if exists "Team members can view standalone track photos" on storage.objects;
drop policy if exists "Team members can upload standalone track photos" on storage.objects;
drop policy if exists "Team members can update standalone track photos" on storage.objects;
drop policy if exists "Team members can delete standalone track photos" on storage.objects;

create policy "Team members can view standalone track photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'track-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can upload standalone track photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'track-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can update standalone track photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'track-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'track-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

create policy "Team members can delete standalone track photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'track-photos'
    and exists (
      select 1
      from public.team_members
      where team_members.user_id = auth.uid()
    )
  );

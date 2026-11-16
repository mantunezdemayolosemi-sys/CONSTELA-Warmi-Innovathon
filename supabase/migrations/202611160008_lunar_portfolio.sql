begin;

create table public.event_participations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null check (event_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  kind text not null check (kind in ('event','hackathon','challenge')),
  source_url text check (char_length(source_url) <= 1000 and source_url like 'https://%'),
  attended_on date not null,
  learning text not null check (char_length(btrim(learning)) between 10 and 2000),
  primary key (user_id, event_id)
);

alter table public.event_participations enable row level security;
revoke all on public.event_participations from public, anon, authenticated;
grant select, insert on public.event_participations to authenticated;
grant update (attended_on, learning) on public.event_participations to authenticated;

create policy event_participations_own on public.event_participations
for all to authenticated
using (
  user_id = (select auth.uid())
  and coalesce((select auth.jwt())->>'email', '') <> ''
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and exists (
    select 1 from public.profiles p where p.id = user_id and p.account_type = 'learner'
  )
)
with check (
  user_id = (select auth.uid())
  and coalesce((select auth.jwt())->>'email', '') <> ''
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) = false
  and exists (
    select 1 from public.profiles p where p.id = user_id and p.account_type = 'learner'
  )
);

create policy community_posts_practiced on public.community_posts
for select to authenticated using (
  kind = 'challenge' and exists (
    select 1 from public.challenge_practices p
    where p.post_id = community_posts.id and p.user_id = (select auth.uid())
  )
);

commit;

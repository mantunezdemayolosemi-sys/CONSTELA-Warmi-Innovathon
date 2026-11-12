-- Ejecutar UNA vez en un proyecto Supabase nuevo (SQL Editor), o mediante migraciones.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
for select to authenticated
using (
  (select auth.uid()) = id
  and coalesce((select auth.jwt()) ->> 'email', '') <> ''
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := btrim(new.raw_user_meta_data ->> 'display_name');
begin
  if profile_name is null or char_length(profile_name) not between 2 and 100 then
    raise exception 'display_name must contain between 2 and 100 characters';
  end if;
  insert into public.profiles (id, display_name) values (new.id, profile_name);
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create function public.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_profile_updated_at() from public, anon, authenticated;

create trigger on_profile_updated
before update on public.profiles
for each row execute function public.touch_profile_updated_at();

commit;

begin;
create table public.challenge_practices (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  proposal text not null check(char_length(btrim(proposal)) between 30 and 5000),
  reflection text not null check(char_length(btrim(reflection)) between 15 and 1000),
  practiced_skills text[] not null,
  completed_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
alter table public.challenge_practices enable row level security;
revoke all on public.challenge_practices from public,anon,authenticated;
grant select on public.challenge_practices to authenticated;
create policy challenge_practices_own on public.challenge_practices for select to authenticated
using(user_id=(select auth.uid()) and coalesce((select auth.jwt())->>'email','')<>''
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);

create function public.complete_challenge_practice(p_post_id uuid,p_proposal text,p_reflection text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); earned boolean; saved public.challenge_practices; practiced text[];
begin
  if actor is null or coalesce(auth.jwt()->>'email','')='' or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not exists(select 1 from public.profiles where id=actor and account_type='learner') then
    raise exception using errcode='42501',message='Learner account required';
  end if;
  if p_proposal is null or char_length(btrim(p_proposal)) not between 30 and 5000
    or p_reflection is null or char_length(btrim(p_reflection)) not between 15 and 1000 then
    raise exception using errcode='22023',message='Invalid practice';
  end if;
  -- Devolver un premio ya registrado incluso si el reto cerró después.
  select * into saved from public.challenge_practices where user_id=actor and post_id=p_post_id;
  if found then return jsonb_build_object('post_id',saved.post_id,'completed_at',saved.completed_at,'practiced_skills',saved.practiced_skills,'awarded',false); end if;
  select skills into practiced from public.community_posts where id=p_post_id and kind='challenge' and status='open' and deadline>now() for share;
  if not found then raise exception using errcode='PT409',message='Challenge is no longer active'; end if;
  insert into public.challenge_practices(user_id,post_id,proposal,reflection,practiced_skills)
    values(actor,p_post_id,btrim(p_proposal),btrim(p_reflection),practiced) on conflict do nothing;
  earned:=found;
  select * into saved from public.challenge_practices where user_id=actor and post_id=p_post_id;
  return jsonb_build_object('post_id',saved.post_id,'completed_at',saved.completed_at,'practiced_skills',saved.practiced_skills,'awarded',earned);
end; $$;
revoke all on function public.complete_challenge_practice(uuid,text,text) from public,anon,authenticated;
grant execute on function public.complete_challenge_practice(uuid,text,text) to authenticated;
commit;

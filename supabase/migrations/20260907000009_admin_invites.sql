-- 관리자 지정: 아직 로그인한 적 없는 사람도 이메일로 미리 관리자 예약할 수 있게 한다.
-- 로그인한 사람은 /admin/users 에서 role 을 바로 바꾼다 (profiles 의 admin update 정책은 003 에 이미 있음).

create table if not exists public.admin_invites (
  email text primary key,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.admin_invites enable row level security;

drop policy if exists "admin_invites: admin all" on public.admin_invites;
create policy "admin_invites: admin all" on public.admin_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 첫 로그인 시 프로필을 만들 때 예약 목록에 있으면 admin 으로
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, company, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    public.company_for_email(new.email),
    case when exists (select 1 from public.admin_invites i where i.email = lower(new.email)) then 'admin' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 예약을 나중에 넣은 경우: 이미 가입한 사람이면 즉시 admin 으로 승격
create or replace function public.apply_admin_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set role = 'admin' where lower(email) = lower(new.email);
  return new;
end;
$$;
drop trigger if exists on_admin_invite on public.admin_invites;
create trigger on_admin_invite
  after insert on public.admin_invites
  for each row execute function public.apply_admin_invite();

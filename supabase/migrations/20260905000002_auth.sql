-- 인증 보조 객체: 회사 도메인 화이트리스트, 프로필 자동 생성, admin 판별

-- 가입 허용 도메인 (명세 8번 "4사 도메인 목록 확정" 전까지 enliple.com 만 등록)
create table allowed_email_domains (
  domain text primary key,
  company text not null check (company in ('enliple','mobisoft','mobiwith','anic')),
  created_at timestamptz default now()
);

-- 이메일 → 회사 코드. 허용되지 않은 도메인이면 null.
create or replace function public.company_for_email(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company
  from allowed_email_domains
  where domain = lower(split_part(p_email, '@', 2))
  limit 1;
$$;

-- 회사 도메인 제한: auth.users insert 트리거에서 이메일 도메인 검사 (명세 RLS 원칙)
create or replace function public.enforce_company_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or public.company_for_email(new.email) is null then
    raise exception 'signup not allowed for this email domain: %', new.email
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_company_domain
  before insert on auth.users
  for each row execute function public.enforce_company_domain();

-- auth.users → profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, company)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    public.company_for_email(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 현재 사용자가 admin 인지 (RLS 정책에서 profiles 재귀 조회를 피하기 위해 security definer)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.company_for_email(text) to anon, authenticated;

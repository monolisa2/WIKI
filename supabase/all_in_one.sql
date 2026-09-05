-- ============================================================================
--  인라이플 위키 · Supabase 한 번에 적용하기
--
--  이 파일 전체를 Supabase SQL Editor 에 붙여 넣고 Run 을 한 번 누르면 끝납니다.
--  (마이그레이션 5개 + seed 3개를 순서대로 이어 붙인 파일. 새 프로젝트에서 1회 실행용.)
--
--  실행 후 마지막 결과창에 categories 9 / documents 57 이 보이면 성공입니다.
--  중간에 오류가 나면 전체가 취소되므로, 원인을 고친 뒤 다시 전체를 실행하면 됩니다.
--
--  원본: supabase/migrations/*.sql, supabase/seed.sql, supabase/seed/*.sql
-- ============================================================================



-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/migrations/20260905000001_schema.sql
-- ────────────────────────────────────────────────────────────────────────────

-- 인라이플 위키 · 스키마 (개발 명세 5번 그대로)

-- 사용자 프로필 (Supabase auth.users 와 1:1)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  company text check (company in ('enliple','mobisoft','mobiwith','anic')),
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz default now()
);

-- 분류
create table categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  hint text,
  sort_order int not null default 0
);

-- 문서
create table documents (
  id uuid primary key default gen_random_uuid(),
  category_id int not null references categories,
  slug text unique not null,
  title text not null,
  summary text,                       -- 검색 결과에 보이는 한 줄
  body_md text,                       -- 위키 자체 문서일 때 본문
  doc_type text not null check (doc_type in ('rule','guide','form','link')),
  scope text[] not null default '{all}',   -- all | enliple | mobisoft | mobiwith | anic
  source_system text,                 -- groupware | naverworks | amaranth | notion | wiki | unknown
  source_url text,
  owner_team text,                    -- 담당 부서
  effective_date date,                -- 시행일
  revised_date date,                  -- 최종 개정일 (null = 내용 수집 필요)
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_pinned boolean default false,
  sort_order int default 0,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body_md,''))
  ) stored,
  created_by uuid references profiles,
  updated_by uuid references profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on documents using gin (search_vector);
create index on documents (category_id, status, sort_order);

-- 개정 이력 (publish 시점마다 스냅샷)
create table document_revisions (
  id bigserial primary key,
  document_id uuid not null references documents on delete cascade,
  version int not null,
  title text,
  summary text,
  body_md text,
  change_note text,                   -- "경조휴가 일수 개정" 등
  revised_by uuid references profiles,
  revised_at timestamptz default now(),
  unique (document_id, version)
);

-- 첨부 (Supabase Storage 경로)
create table attachments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references profiles,
  created_at timestamptz default now()
);

-- 임직원 제보 (오류·누락)
create table feedback (
  id bigserial primary key,
  document_id uuid references documents on delete set null,
  message text not null,
  submitted_by uuid references profiles,
  resolved boolean default false,
  created_at timestamptz default now()
);


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/migrations/20260905000002_auth.sql
-- ────────────────────────────────────────────────────────────────────────────

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


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/migrations/20260905000003_rls.sql
-- ────────────────────────────────────────────────────────────────────────────

-- RLS (개발 명세 5번 "RLS 원칙")

alter table profiles enable row level security;
alter table categories enable row level security;
alter table documents enable row level security;
alter table document_revisions enable row level security;
alter table attachments enable row level security;
alter table feedback enable row level security;
alter table allowed_email_domains enable row level security;

-- profiles: 본인 것만 select/update. role 변경은 admin 만.
create policy "profiles: self select" on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: self update" on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = (select p.role from profiles p where p.id = auth.uid()))
  );

-- categories: 로그인 사용자 전체 select, admin 전체 CRUD
create policy "categories: read" on categories
  for select to authenticated using (true);
create policy "categories: admin write" on categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- documents: 임직원은 published 만 select. admin 은 전체 CRUD.
create policy "documents: read published" on documents
  for select to authenticated
  using (status = 'published' or public.is_admin());
create policy "documents: admin write" on documents
  for insert to authenticated with check (public.is_admin());
create policy "documents: admin update" on documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "documents: admin delete" on documents
  for delete to authenticated using (public.is_admin());

-- document_revisions / attachments: published 문서에 속한 것만 임직원 select. admin 전체.
create policy "revisions: read" on document_revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from documents d where d.id = document_id and d.status = 'published')
  );
create policy "revisions: admin write" on document_revisions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "attachments: read" on attachments
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from documents d where d.id = document_id and d.status = 'published')
  );
create policy "attachments: admin write" on attachments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- feedback: 임직원은 insert + 본인 것 select. admin 전체.
create policy "feedback: insert own" on feedback
  for insert to authenticated with check (submitted_by = auth.uid());
create policy "feedback: read own" on feedback
  for select to authenticated using (submitted_by = auth.uid() or public.is_admin());
create policy "feedback: admin update" on feedback
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "feedback: admin delete" on feedback
  for delete to authenticated using (public.is_admin());

-- allowed_email_domains: 로그인 화면 사전 검사를 위해 읽기는 공개, 변경은 admin
create policy "domains: read" on allowed_email_domains
  for select to anon, authenticated using (true);
create policy "domains: admin write" on allowed_email_domains
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/migrations/20260905000004_functions.sql
-- ────────────────────────────────────────────────────────────────────────────

-- 문서 함수: updated_at 자동 갱신, publish 시 개정 이력 스냅샷

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on documents
  for each row execute function public.set_updated_at();

-- publish: status 를 published 로 바꾸고 document_revisions 에 스냅샷을 남긴다.
-- 이미 published 인 문서에 다시 호출하면 "개정 발행"으로 새 버전이 쌓인다.
create or replace function public.publish_document(p_document_id uuid, p_change_note text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc documents%rowtype;
  v_version int;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into v_doc from documents where id = p_document_id for update;
  if not found then
    raise exception 'document not found: %', p_document_id using errcode = 'P0002';
  end if;

  if v_doc.doc_type = 'link' and coalesce(v_doc.source_url, '') = '' then
    raise exception 'link 문서는 source_url 이 필요합니다' using errcode = '23514';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from document_revisions where document_id = p_document_id;

  insert into document_revisions (document_id, version, title, summary, body_md, change_note, revised_by)
  values (p_document_id, v_version, v_doc.title, v_doc.summary, v_doc.body_md, p_change_note, auth.uid());

  update documents
  set status = 'published',
      updated_by = auth.uid()
  where id = p_document_id;

  return v_version;
end;
$$;

grant execute on function public.publish_document(uuid, text) to authenticated;

-- 특정 버전 복원 (관리자 화면 "개정 이력 > 특정 버전 복원"). 복원 후에는 다시 publish 해야 반영된다.
create or replace function public.restore_document_revision(p_revision_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev document_revisions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into v_rev from document_revisions where id = p_revision_id;
  if not found then
    raise exception 'revision not found: %', p_revision_id using errcode = 'P0002';
  end if;

  update documents
  set title = v_rev.title,
      summary = v_rev.summary,
      body_md = v_rev.body_md,
      updated_by = auth.uid()
  where id = v_rev.document_id;
end;
$$;

grant execute on function public.restore_document_revision(bigint) to authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/migrations/20260905000005_search.sql
-- ────────────────────────────────────────────────────────────────────────────

-- 통합 검색: 제목·요약·본문 전문검색(simple) + 부분일치(ilike) 결합, 하이라이트 포함
-- security invoker 이므로 RLS 가 그대로 적용된다 (임직원은 published 만).

create or replace function public.search_documents(p_query text, p_limit int default 20)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  doc_type text,
  scope text[],
  revised_date date,
  source_system text,
  source_url text,
  is_pinned boolean,
  category_slug text,
  category_name text,
  score real,
  headline text
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select websearch_to_tsquery('simple', p_query) as tsq,
           '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%' as pat
  )
  select
    d.id, d.slug, d.title, d.summary, d.doc_type, d.scope, d.revised_date, d.source_system, d.source_url,
    coalesce(d.is_pinned, false),
    c.slug, c.name,
    (
      (case when d.search_vector @@ q.tsq then ts_rank(d.search_vector, q.tsq) * 4 else 0 end)
      + (case when d.title ilike q.pat then 2.0 else 0 end)
      + (case when d.summary ilike q.pat then 1.0 else 0 end)
      + (case when d.body_md ilike q.pat then 0.3 else 0 end)
    )::real as score,
    ts_headline(
      'simple',
      coalesce(
        nullif(d.summary, ''),
        regexp_replace(left(coalesce(d.body_md, ''), 600), '(^|\n)#+\s*|[*`>]|\[([^\]]*)\]\([^)]*\)', '\2', 'g'),
        ''
      ),
      q.tsq,
      'MaxFragments=1, MaxWords=28, MinWords=10, StartSel=⟦, StopSel=⟧'
    ) as headline
  from documents d
  join categories c on c.id = d.category_id
  cross join q
  where d.status = 'published'
    and (
      d.search_vector @@ q.tsq
      or d.title ilike q.pat
      or d.summary ilike q.pat
      or d.body_md ilike q.pat
    )
  order by score desc, coalesce(d.is_pinned, false) desc, d.title
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_documents(text, int) to authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/seed.sql
-- ────────────────────────────────────────────────────────────────────────────

-- 기본 seed: 분류 9개 (개발 명세 4번) + 가입 허용 도메인
-- 문서 seed 는 supabase/seed/*.sql 참조

insert into categories (slug, name, hint, sort_order) values
  ('start',      '입사와 첫 주', '온보딩 체크리스트, 계정 발급, 수습 전환평가, 퇴사 절차', 10),
  ('hr',         '인사제도',     '취업규칙(링크만), 직급, 승진, 발령, 이의제기, 고충처리', 20),
  ('perf',       '평가와 보상',  '성과관리, KPI, 연봉, 직무발명, 장기근속, 인재추천', 30),
  ('time',       '근태와 휴가',  '연차, 촉진, 경조사, 유연근무, 재택, 보상휴가, 출장', 40),
  ('benefit',    '복리후생',     '식권, 윙크, 복지포인트, 건강검진, 도서', 50),
  ('tools',      '업무 도구',    '네이버웍스, 그룹웨어, 아마란스, 노션, 복합기, 공용계정', 60),
  ('general',    '총무와 경비',  '법인카드, 명함, 장비·비품, 휴대폰, 좌석, 주차', 70),
  ('compliance', '규정 준수',    '법정의무교육, 정보보안, 노사협의회, 징계, 겸업', 80),
  ('about',      '회사 안내',    '소개·연혁, 계열사 구조, 조직도, CI, 비상연락망', 90)
on conflict (slug) do update
  set name = excluded.name, hint = excluded.hint, sort_order = excluded.sort_order;

-- 4사 도메인 확정 전 (명세 8번). 나머지 3사는 확정 후 추가.
insert into allowed_email_domains (domain, company) values
  ('enliple.com', 'enliple')
on conflict (domain) do nothing;


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/seed/onboarding_todo.sql
-- ────────────────────────────────────────────────────────────────────────────

-- seed: 온보딩 가이드 "인라이플 신규입사자 To Do List" HTML → 마크다운 문서 13건
-- (개발 순서 6단계 "온보딩 가이드 HTML 15건을 마크다운으로 변환" 중 1건)
--
-- * 모두 status='draft' 로 넣는다. 인사관리실이 내용을 확인하고 최종 개정일을 채운 뒤 관리자 화면에서 발행한다.
-- * 원문 HTML 의 화면 캡처 이미지는 포함하지 않았다. 필요하면 attachments(Storage) 로 등록.
-- * 이미 같은 slug 가 있으면 건너뛴다 (관리자 수정 내용을 덮어쓰지 않기 위해).

with docs (category_slug, slug, title, summary, doc_type, owner_team, sort_order, body_md) as (
values

-- ─────────────────────────────────────────────────────────────
('start', 'new-hire-todo', '신규입사자 To Do List',
 '입사 첫 주에 순서대로 진행하는 8가지 설정·가입 체크리스트와 사내 생활 가이드 안내',
 'guide', '인사관리실', 10,
$md$## 적용 범위
인라이플 신규 입사자

## 내용
인라이플에 합류하시게 된 것을 진심으로 환영합니다. 아래 순서대로 차근차근 진행해주세요.

### Welcome Checklist
1. 신규입사자 입문 교육
2. [사내 네트워크 설치](/docs/network-setup)
3. [네이버웍스 설치 및 가입](/docs/naverworks-setup)
4. 네이버웍스 사진 등록 및 프로필 변경 → 네이버웍스 설치 문서의 "프로필 작성 가이드" 참고
5. [그룹웨어 로그인 및 인사기록카드 작성](/docs/groupware-hr-card) · [아마란스 로그인 및 인사기록카드 작성](/docs/amaranth-hr-card)
6. [명함 제작 신청](/docs/business-card) · [복합기 및 오피스 프로그램 설치](/docs/printer-office-setup)
7. [네이버웍스 게시판 공지사항 확인](/docs/naverworks-board) (사내규정 확인)
8. [인라이플 노션용 구글 계정 생성](/docs/notion-google-account) (선택 · 노션이 필요한 분들만)

### 사내 생활 가이드
- [페이코 식권 사용방법](/docs/payco-meal-ticket)
- [페이코 식권 지급 기준](/docs/meal-ticket-policy)
- [임직원몰 윙크(WEINC) 사용방법](/docs/weinc-mall)
- [법인카드 반출신청서](/docs/corp-card-checkout)

## 신청 · 처리 방법
각 항목의 문서에서 단계별 안내를 확인하세요. 계정 정보(네이버웍스, 그룹웨어, 아마란스, 페이코 인증코드)는 입사 당일 받은 계정 페이퍼를 확인해주세요.

## 관련 문서
- 위 체크리스트의 각 문서

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'network-setup', '사내 네트워크 설치 (Windows 11)',
 'IP 설정, NAC 에이전트, V3 백신, OfficeKeeper 설치, 윈도우 로컬 계정 암호 설정 순서',
 'guide', '보안팀', 10,
$md$## 적용 범위
인라이플 (업무용 PC 지급 대상자)

## 내용
Windows 11 기준으로 아래 순서대로 진행해주세요.

- 네트워크 문의: 김용연 차장 (070-4230-8114)
- PC 지급 후 IP 할당은 보안팀에 문의

### 1. 네트워크 IP 설정
1. 윈도우 키 + R 을 눌러 실행창에 `control` 입력 후 확인
2. 네트워크 및 인터넷 클릭
3. 이더넷 클릭
4. 이더넷 상태 창에서 속성 클릭
5. 인터넷 프로토콜 버전 4(TCP/IPv4) 클릭
6. 보안팀에서 할당받은 IP · 서브넷 마스크 · 게이트웨이 · DNS 적용

### 2. 에이전트 설치 (NAC)
설치 페이지: http://192.168.100.241/agent (사내망에서만 접속)

1. 설치 페이지 접속 후 업무용 PC OS(Windows/Mac) 확인하여 에이전트 파일 다운로드 및 설치
2. 아이디: 네이버웍스 이메일 계정의 @ 앞부분 (예: jhjung@enliple.com → `jhjung`)
3. 초기 비밀번호: 아이디와 동일
4. 인증 후 비밀번호를 꼭 변경해주세요.

### 3. 백신 설치 (V3)
설치 페이지: http://192.168.100.241/cwp (사내망에서만 접속)

1. 설치 페이지 접속 후 V3 백신 설치 클릭
2. 사용자 이름 입력 (예: 홍길동)
3. 사원 번호 입력 (예: H-04-002) · 사원번호는 입사 시 제공됩니다

> 반드시 위 2개(사용자 이름 · 사원 번호)만 입력해주세요.

### 4. 통합PC보안시스템 설치 (OfficeKeeper)
설치 페이지: http://192.168.100.241/cwp (사내망에서만 접속)

1. 설치 페이지 접속 후 통합PC-보안 설치 클릭, 다운로드 후 설치 실행
2. 사용자 이름 입력 (예: 홍길동)
3. 사원 이메일 입력 (예: he@enliple.com)

### 5. 윈도우 PC 패스워드 설정
로컬 계정 · 로그인 암호 설정 기준

1. 시작 버튼 클릭 → 설정 열기 (단축키: Win + I)
2. 설정 → 계정 → 로그인 옵션으로 이동
3. 로그인 옵션에서 '암호' 항목 선택 (PIN(Windows Hello) · Microsoft 계정 로그인은 사용할 수 없습니다)
4. 새 암호 입력 → 확인 → 다음 → 완료 (이 암호는 보안장비를 통해 관리됩니다)

**꼭 지켜주세요**
- PIN 설정은 하지 마세요. PIN 방식은 사용할 수 없습니다.
- Microsoft 계정 로그인 방식은 사용할 수 없습니다. 반드시 로컬 계정의 암호 방식으로 설정해주세요.
- 암호는 영문 · 숫자 · 특수문자 조합의 안전한 비밀번호를 권장합니다.

## 신청 · 처리 방법
IP 할당과 네트워크 관련 문의는 보안팀(김용연 차장, 070-4230-8114)으로 연락해주세요.

## 관련 문서
- [신규입사자 To Do List](/docs/new-hire-todo)
- [네이버웍스 설치 및 가입](/docs/naverworks-setup)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'naverworks-setup', '네이버웍스 설치 및 가입',
 '네이버웍스 다운로드·로그인, 프로필과 메일 서명 등록, 프로필 작성 가이드',
 'guide', '인사관리실', 20,
$md$## 적용 범위
인라이플

## 내용
사내 메신저 · 메일 · 캘린더의 중심 도구입니다. 프로필까지 꼭 완성해주세요.

1. [네이버웍스 다운로드 페이지](https://naver.worksmobile.com/download/)에서 64bit 버전 다운로드
2. 계정 페이퍼에서 계정정보 확인 후 로그인
3. 메일 오른쪽 상단 설정 → 개인정보 → 내 프로필에서 프로필 등록, 메일 서명 등록
4. 인라이플 업무 툴 활용하기: 캘린더, 게시판, 드라이브, 할 일, 주소록 등

### 프로필 작성 가이드
- 사진: 얼굴이 보이는 사진
- 사내 번호 / 휴대폰 번호 기입
- 근무처: 근무하는 호수 기입
- 담당 업무: 10자 내로 간단하게 주 업무 기입

## 신청 · 처리 방법
계정 정보는 입사 당일 받은 계정 페이퍼를 확인하세요. 계정 관련 문의는 인사관리실.

## 관련 문서
- [네이버웍스 게시판 공지사항 확인](/docs/naverworks-board)
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'groupware-hr-card', '그룹웨어 로그인 / 인사기록카드 작성',
 '그룹웨어(group.enliple.com) 로그인 후 인사기록카드 필수 항목 작성 방법',
 'guide', '인사관리실', 30,
$md$## 적용 범위
인라이플

## 내용
그룹웨어 주소: http://group.enliple.com

1. 그룹웨어에 접속하여 사번 · 비밀번호로 로그인
2. 상단 인사조직 → 인사기본사항 → 인사기록카드 등록
3. [수정] 버튼을 누른 뒤 * 표시된 항목 필수 기입
   - 한글성명 · 한자성명 · 영문성명
   - 기본 / 연락처·주소 / 가족관계 / 업무분장표 탭

## 신청 · 처리 방법
경로: 그룹웨어 > 인사조직 > 인사기본사항 > 인사기록카드 등록

## 관련 문서
- [아마란스 로그인 / 인사기록카드 작성](/docs/amaranth-hr-card)
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'amaranth-hr-card', '아마란스 로그인 / 인사기록카드 작성',
 '아마란스(a10.enliple.com) 로그인, 비밀번호 변경, 인사정보변경신청 작성',
 'guide', '인사관리실', 40,
$md$## 적용 범위
인라이플

## 내용
아마란스 주소: http://a10.enliple.com

- 사번: 그룹웨어 ID
- 비밀번호: 초기 PW (계정 페이퍼 확인)

1. 아마란스에 접속하여 로그인
2. 비밀번호 변경: 임직원업무관리 > 마이페이지 > 개인인사정보조회 > 로그인 비밀번호변경
3. 마이페이지 > 내정보관리 > 인사정보변경신청 > [수정] 버튼 클릭 후, 인적정보 · 기본정보 · 가족 · 학력 · 경력 등 모두 상세히 기재 (필수)

**참고**
- 입사 후 핸드폰 번호 또는 주소지가 변경된 경우 최신화해주세요.
- 비상연락망은 본인 번호가 아닌 배우자, 부모님, 지인 등의 연락처로 기재해주세요.

## 신청 · 처리 방법
경로: 아마란스 > 마이페이지 > 내정보관리 > 인사정보변경신청

## 관련 문서
- [그룹웨어 로그인 / 인사기록카드 작성](/docs/groupware-hr-card)
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('general', 'business-card', '명함 제작 신청',
 '명함 양식 다운로드 후 총무팀에 메일로 신청. 제작 주기·기간과 일반/카드 명함 기준',
 'guide', '총무팀', 10,
$md$## 적용 범위
인라이플

## 내용
담당: 총무팀 변재훈 주임 (jhbyeon@enliple.com)

1. [명함 신청 게시판](https://buly.kr/DaRLIIU)에서 양식 다운로드 (일반명함 양식.xlsx 또는 카드명함 양식.xlsx)
2. 내용 작성 후 변재훈 주임에게 메일 발송
   - 메일 제목에 '일반명함' 또는 '카드명함' 필히 기재 (예: [일반명함] 홍길동 명함 제작 신청)
3. 제작 완료 시 사내 메신저로 개별 연락 → 경영지원실에서 수령

### 참고
- 신청 주기: 매주 화요일 오전 11시까지 요청받은 명함을 한 번에 제작
- 제작 기간: 일반 명함 영업일 2~3일 / 카드 명함 영업일 6~8일
- 신청 기준(디자인 동일): 일반 명함은 전직원 / 카드 명함은 영업자 등 외부 활동이 많은 직무

## 신청 · 처리 방법
경로: 네이버웍스 게시판 > 명함 신청 게시판 > 양식 다운로드 → 총무팀 담당자에게 메일 신청

## 관련 문서
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'printer-office-setup', '복합기 및 오피스 프로그램 설치',
 '복합기 설치 안내 링크와 오피스 프로그램 설치 자료 위치',
 'guide', '총무팀', 50,
$md$## 적용 범위
인라이플

## 내용
1. 복합기 설치: [복합기 설치 안내](https://buly.kr/E7BcElE)에 따라 진행해주세요.
2. 오피스 프로그램: 네이버웍스 게시판 '프로그램 설치 및 기타 자료실' 자료 참고

## 신청 · 처리 방법
설치 자료는 네이버웍스 게시판 > 프로그램 설치 및 기타 자료실에서 내려받습니다.

## 관련 문서
- [네이버웍스 게시판 공지사항 확인](/docs/naverworks-board)
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'naverworks-board', '네이버웍스 게시판 공지사항 확인',
 '공지사항, 사내규정, 프로그램 설치 및 기타 자료실 게시판에서 꼭 확인할 내용',
 'guide', '인사관리실', 25,
$md$## 적용 범위
인라이플

## 내용
네이버웍스 게시판에서 아래 내용을 꼭 확인해주세요.

- **공지사항**: 인사 · 회계 등 전사 안내
- **사내규정**: 취업규칙, 복지제도, 경조사 규정 등
- **프로그램 설치 및 기타 자료실**: 업무에 필요한 설치 자료

## 신청 · 처리 방법
네이버웍스 > 게시판 에서 각 게시판을 확인합니다.

## 관련 문서
- [네이버웍스 설치 및 가입](/docs/naverworks-setup)
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('tools', 'notion-google-account', '인라이플 노션용 구글 계정 생성 (선택)',
 '회사 메일로 구글 계정을 만들고 노션에 가입하는 방법. 노션이 필요한 분들만',
 'guide', '인사관리실', 60,
$md$## 적용 범위
인라이플 (노션이 필요한 임직원만)

## 내용
1. 구글 로그인 화면에서 계정 만들기 → 개인용 선택 후 이름 · 생년월일 · 성별 입력
2. 이메일 주소 만들기에서 [기존 이메일 사용] 클릭 → 네이버웍스 회사 이메일 주소로 생성
3. 회사 메일로 발송된 인증 코드 입력 (메일이 안 보이면 스팸함 확인)
4. 비밀번호 설정 → 휴대전화 보안문자 인증 → 약관 동의 후 계정 만들기 완료
5. 생성한 구글 계정으로 노션 가입 (Notion 로그인 화면에서 Google 버튼 선택)

## 신청 · 처리 방법
별도 신청 없이 본인이 진행합니다. 노션 워크스페이스 초대는 팀 담당자에게 요청하세요.

## 관련 문서
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('benefit', 'payco-meal-ticket', '페이코 식권 사용방법',
 '페이코 앱 소속기관 인증, 식권 생성·사용·보내기, 사용처 확인과 꿀팁',
 'guide', '인사관리실', 10,
$md$## 적용 범위
인라이플

## 내용
야근 식대는 페이코(PAYCO) 앱의 식권으로 사용합니다. 처음 한 번만 설정하면 이후엔 간편합니다.

### 1. 앱 설치 및 소속기관 인증
1. App Store 또는 Google Play에서 페이코(PAYCO) 검색 후 설치
2. 회원가입 후 로그인
3. 홈 화면 하단 전체(더보기) 클릭
4. 인증 영역의 소속기관 인증 클릭
5. 입사 당일 받은 페이퍼에서 계정 확인 후, 소속기관 인증코드에 본인 계정(사번) 기입 (예: BIZ@ENLIPLE@A-01-001)
6. 전체(더보기) → 라이프 → 기업복지로 이동하면 인증 완료

### 2. 식권 생성
1. 기업복지 → 더보기 클릭
2. 식권신청 클릭
3. 중식(또는 석식) 신청하기 클릭
4. 하단 확인 클릭 × 2회
5. 기업복지 홈에서 식권 생성 확인

### 3. 식권 사용
- **직접 사용**: 식권의 사용하기 클릭 → 매장에서 바코드 결제
- **보내기(모아서 결제)**: 보내기 클릭 → 받는 동료의 사번 입력 (최초 1회 입력 후 자동 기록 · 받은 동료가 한 번에 사용 가능)
- **보내기 취소**: 보내기 취소 클릭 → "예" 클릭 → 식권 회수 확인

### 4. 사용처 확인 & 꿀팁
1. 기업복지 화면에서 식권 사용처 보기 클릭
2. 가까운 거리 순으로 사용처 확인 · 새로운 사용처도 수시로 추가됩니다

> ★ 한신IT타워 구내식당 메뉴 확인: 카카오톡 친구 찾기에서 '한신' 검색 → 채널 프로필 사진 클릭 → 그 날의 메뉴 확인

## 신청 · 처리 방법
페이코 앱 > 기업복지 > 식권신청. 지급 대상과 사용 시간은 [페이코 식권 지급 기준](/docs/meal-ticket-policy)을 따릅니다.

## 관련 문서
- [페이코 식권 지급 기준](/docs/meal-ticket-policy)
- [임직원몰 윙크(WEINC) 사용방법](/docs/weinc-mall)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('benefit', 'meal-ticket-policy', '페이코 식권 지급 기준',
 '요일별 식권 지급 대상과 사용 시간, 퇴근 지문 인식 필수 안내',
 'rule', '인사관리실', 20,
$md$## 적용 범위
인라이플

## 내용
### 월요일 ~ 목요일 (석식)
- 지급 대상: 오후 9시 이후까지 근무하시는 분
- 식권 사용 시간: 18:30 ~ 21:00 (해당 시간 내 미사용 시 식권 소멸)

### 금요일 (중식)
- 지급 대상: 오후 3시 이후까지 근무하시는 분
- 식권 사용 시간: 10:00 ~ 14:30 (해당 시간 내 미사용 시 식권 소멸)

### 퇴근 지문 인식 필수
월~목 오후 9시 이후, 금요일 오후 3시 이후에 퇴근 지문 인식 기록이 없을 시, 사용한 식권이 급여에서 자동 차감됩니다. 잊지 말고 퇴근 지문 인식 부탁드려요.

## 신청 · 처리 방법
식권 생성과 사용 방법은 [페이코 식권 사용방법](/docs/payco-meal-ticket)을 참고하세요.

## 관련 문서
- [페이코 식권 사용방법](/docs/payco-meal-ticket)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('benefit', 'weinc-mall', '임직원몰 윙크(WEINC) 사용방법',
 '윙크 앱 설치·인증, 티켓 구매와 확인, 브랜드 티켓·상품권 구매 꿀팁',
 'guide', '인사관리실', 30,
$md$## 적용 범위
인라이플

## 내용
복지 포인트로 회사 주변 식당 티켓, 커피, 상품권 등을 할인가에 구매할 수 있는 임직원몰입니다.

### 1. 앱 설치
1. App Store 또는 Google Play에서 윙크(WEINC) 검색 후 설치
2. 회원가입 후 로그인 시 사번에 '인라이플' 또는 'enliple' 기입 · 인증

### 2. 티켓 구매
1. 오늘티켓 → 음식점 클릭
2. 먹고 싶은 메뉴 클릭
3. 구매하기 클릭
4. 바로 먹기 / 나중에 먹기 선택
5. 결제하기 클릭
6. PAYCO 앱으로 결제 클릭 → 페이코에서 쿠폰(식권/복지포인트) 확인 후 결제

### 3. 티켓 확인
1. 메인 페이지 하단 마이메뉴 클릭
2. 쿠폰에서 구매한 티켓 확인

### 4. 꿀팁
- 브랜드 티켓: 커피 / 버거 / 피자 등 다양한 사용처. 매일 아침 7~9시 출근길 아메리카노 15% 할인
- 외식 모바일 상품권 구매 가능 (구매 횟수 월 2회 제한)
- 상품권 · 포인트 등 구매 가능 (종류에 따라 구매 횟수 상이)

## 신청 · 처리 방법
윙크 앱에서 직접 구매하고 페이코로 결제합니다.

## 관련 문서
- [페이코 식권 사용방법](/docs/payco-meal-ticket)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$),

-- ─────────────────────────────────────────────────────────────
('general', 'corp-card-checkout', '법인카드 반출신청서',
 '그룹웨어 전자결재로 법인카드&상품권 반출신청서를 작성하는 경로와 작성 방법',
 'guide', '총무팀', 20,
$md$## 적용 범위
인라이플

## 내용
법인카드가 필요할 때는 그룹웨어 전자결재로 반출신청서를 작성합니다.

### 신청 루트
1. 그룹웨어에서 전자결재 클릭
2. 결재작성 클릭
3. 협조문서 선택
4. 법인카드&상품권반출신청서 선택

### 작성 방법
1. 제목: 목적에 맞는 제목 작성
2. 신청구분에서 "반출" 선택
3. 상세내용 작성 (② 항목만 작성)

### 상세내용 작성 참고
- 작성: 팀장(직책카드) 또는 영업자카드
- 한도: 규정에 따라 재무팀 별도 반영
- 팀장(직책): 본인 외 팀원 4명 이상 팀 운영 시

## 신청 · 처리 방법
경로: 그룹웨어 전자결재 > 결재작성 > 협조문서 > 법인카드&상품권반출신청서

## 관련 문서
- [신규입사자 To Do List](/docs/new-hire-todo)

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
$md$)

)
insert into documents (category_id, slug, title, summary, body_md, doc_type, scope, source_system, owner_team, status, sort_order)
select c.id, d.slug, d.title, d.summary, d.body_md, d.doc_type, '{enliple}'::text[], 'wiki', d.owner_team, 'draft', d.sort_order
from docs d
join categories c on c.slug = d.category_slug
on conflict (slug) do nothing;


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ supabase/seed/index_stubs.sql
-- ────────────────────────────────────────────────────────────────────────────

-- seed: 인덱스 문서 44건
-- 개발 명세 4번 "분류 체계" 의 설명(hint)에 나열된 주제를 문서로 미리 등록한다.
-- 위키의 1차 역할이 "어디에 있고 최신인지 보증하는 인덱스" 이므로, 원문 위치·개정일을 아직 몰라도
-- 제목과 다룰 내용만으로 먼저 등록하고 인사관리실이 채워간다.
--
-- * source_system = 'unknown' → 관리자 대시보드 "원본 출처 미확인" 에 집계
-- * revised_date  = null      → 임직원 화면 "내용 수집 필요" 표시
-- * 이미 온보딩 가이드로 등록된 주제(온보딩 체크리스트, 식권, 윙크, 네이버웍스, 복합기, 명함)는 제외
-- * 같은 slug 가 있으면 건너뛴다.
--
-- initial_status: 명세 8번 권장("초기에는 임직원에게도 노출해 제보를 받는 방향")에 따라 published.
--                 임직원에게 숨기려면 아래 값을 'draft' 로 바꿔 실행하거나, 실행 후
--                 update documents set status = 'draft' where source_system = 'unknown';

with cfg as (
  select 'published'::text as initial_status
),
stubs (category_slug, slug, title, summary, doc_type, owner_team, source_system, sort_order, related_md) as (
values

-- 입사와 첫 주 ───────────────────────────────────────────────
('start', 'account-provisioning', '계정 발급',
 '입사 시 발급되는 네이버웍스·그룹웨어·아마란스·페이코 계정과 초기 비밀번호, 분실 시 문의처',
 'guide', '인사관리실', 'unknown', 20,
 '- [신규입사자 To Do List](/docs/new-hire-todo)
- [네이버웍스 설치 및 가입](/docs/naverworks-setup)
- [사내 네트워크 설치](/docs/network-setup)'),
('start', 'probation-review', '수습 전환평가',
 '수습 기간과 전환평가 일정, 평가 항목, 결과 통보 절차',
 'guide', '인사관리실', 'unknown', 30, ''),
('start', 'offboarding', '퇴사 절차',
 '사직 의사 전달, 인수인계, 장비·계정 반납, 퇴직 정산과 서류 발급 순서',
 'guide', '인사관리실', 'unknown', 40, ''),

-- 인사제도 ───────────────────────────────────────────────────
('hr', 'employment-rules', '취업규칙',
 '취업규칙 원문. 네이버웍스 게시판 ''사내규정'' 에서 최신 버전을 확인',
 'link', '인사관리실', 'naverworks', 10,
 '- [네이버웍스 게시판 공지사항 확인](/docs/naverworks-board)'),
('hr', 'job-grades', '직급 체계',
 '직급·직책 구분과 호칭, 직급별 역할 기준',
 'rule', '인사관리실', 'unknown', 20, ''),
('hr', 'promotion', '승진',
 '승진 심사 시기, 대상 요건, 심사 절차와 결과 반영',
 'rule', '인사관리실', 'unknown', 30, ''),
('hr', 'transfer', '발령',
 '부서 이동·전보·겸직 발령의 기준과 절차, 통보 방식',
 'rule', '인사관리실', 'unknown', 40, ''),
('hr', 'appeal', '이의제기',
 '평가·인사 결정에 대한 이의제기 방법, 접수 창구, 처리 기한',
 'guide', '인사관리실', 'unknown', 50, ''),
('hr', 'grievance', '고충처리',
 '직장 내 고충의 상담·신고 창구, 처리 절차와 비밀 보장 원칙',
 'guide', '인사관리실', 'unknown', 60, ''),

-- 평가와 보상 ─────────────────────────────────────────────────
('perf', 'performance-management', '성과관리',
 '목표 설정부터 중간 점검, 연말 평가까지 성과관리 주기와 방법',
 'guide', '인사관리실', 'unknown', 10, ''),
('perf', 'kpi', 'KPI 운영',
 'KPI 수립 기준, 등록·수정 절차, 달성률 산정과 트래킹 방식',
 'guide', '인사관리실', 'unknown', 20, ''),
('perf', 'salary', '연봉',
 '연봉 산정과 조정 시기, 통보 절차, 급여 지급일과 명세 확인 방법',
 'rule', '인사관리실', 'unknown', 30, ''),
('perf', 'employee-invention', '직무발명',
 '직무발명 신고 절차, 권리 승계와 보상 기준',
 'rule', '인사관리실', 'unknown', 40, ''),
('perf', 'long-service-award', '장기근속 포상',
 '장기근속 기준 연차와 포상 내용, 지급 시기',
 'rule', '인사관리실', 'unknown', 50, ''),
('perf', 'referral', '인재추천',
 '임직원 인재추천 절차, 추천 보상 기준과 지급 조건',
 'guide', '인사관리실', 'unknown', 60, ''),

-- 근태와 휴가 ─────────────────────────────────────────────────
('time', 'annual-leave', '연차',
 '연차 발생 기준, 신청 방법(그룹웨어 전자결재), 잔여 연차 확인, 이월·정산',
 'rule', '인사관리실', 'unknown', 10,
 '- [그룹웨어 사용 안내](/docs/groupware-guide)'),
('time', 'leave-promotion', '연차 사용 촉진',
 '연차 사용 촉진 제도의 안내 시기, 절차, 미사용 연차 처리',
 'rule', '인사관리실', 'unknown', 20,
 '- [연차](/docs/annual-leave)'),
('time', 'family-events', '경조사',
 '경조 휴가 일수, 경조금 지급 기준, 신청 방법과 증빙 서류',
 'rule', '인사관리실', 'unknown', 30, ''),
('time', 'flexible-work', '유연근무',
 '시차출퇴근 등 유연근무 유형, 신청 자격과 절차, 근무시간 기록',
 'rule', '인사관리실', 'unknown', 40, ''),
('time', 'remote-work', '재택근무',
 '재택근무 신청 조건과 절차, 근무 시간과 보안 준수 사항',
 'rule', '인사관리실', 'unknown', 50,
 '- [정보보안](/docs/information-security)'),
('time', 'compensatory-leave', '보상휴가',
 '연장·휴일 근무에 대한 보상휴가 산정 기준과 사용 방법',
 'rule', '인사관리실', 'unknown', 60, ''),
('time', 'business-trip', '출장',
 '출장 신청과 결재, 교통·숙박·일비 기준, 정산 방법',
 'guide', '인사관리실', 'unknown', 70,
 '- [법인카드 사용 기준](/docs/corporate-card-policy)'),

-- 복리후생 (식권·윙크는 온보딩 가이드 문서로 이미 등록) ─────────
('benefit', 'welfare-points', '복지포인트',
 '복지포인트 지급 기준과 시기, 사용처, 잔액 확인 방법',
 'guide', '인사관리실', 'unknown', 40,
 '- [임직원몰 윙크(WEINC) 사용방법](/docs/weinc-mall)'),
('benefit', 'health-checkup', '건강검진',
 '건강검진 대상과 주기, 지정 병원, 예약과 결과 확인 절차',
 'guide', '인사관리실', 'unknown', 50, ''),
('benefit', 'book-support', '도서 구입 지원',
 '업무 관련 도서 구입 지원 한도, 신청 방법과 정산',
 'guide', '인사관리실', 'unknown', 60, ''),

-- 업무 도구 (네이버웍스·복합기는 이미 등록) ────────────────────
('tools', 'groupware-guide', '그룹웨어 사용 안내',
 '그룹웨어 전자결재·근태·인사 메뉴 사용법, 주요 결재 양식 위치',
 'guide', '인사관리실', 'unknown', 70,
 '- [그룹웨어 로그인 / 인사기록카드 작성](/docs/groupware-hr-card)
- [법인카드 반출신청서](/docs/corp-card-checkout)'),
('tools', 'amaranth-guide', '아마란스 사용 안내',
 '아마란스 주요 메뉴(인사·급여·경비)와 자주 쓰는 기능',
 'guide', '인사관리실', 'unknown', 80,
 '- [아마란스 로그인 / 인사기록카드 작성](/docs/amaranth-hr-card)'),
('tools', 'notion-guide', '노션 사용 안내',
 '인라이플 노션 워크스페이스 구조, 초대 요청, 기본 사용 규칙',
 'guide', '인사관리실', 'unknown', 90,
 '- [인라이플 노션용 구글 계정 생성 (선택)](/docs/notion-google-account)'),
('tools', 'shared-accounts', '공용계정',
 '팀·부서 공용계정 종류, 사용 신청과 비밀번호 관리 원칙',
 'guide', '인사관리실', 'unknown', 100, ''),

-- 총무와 경비 (명함·법인카드 반출은 이미 등록) ──────────────────
('general', 'corporate-card-policy', '법인카드 사용 기준',
 '법인카드 사용 가능 항목과 한도, 증빙 제출, 사용 내역 정산 절차',
 'rule', '재무팀', 'unknown', 30,
 '- [법인카드 반출신청서](/docs/corp-card-checkout)'),
('general', 'equipment', '장비·비품',
 '업무용 PC·모니터 등 장비 지급 기준, 비품 신청과 반납 절차',
 'guide', '총무팀', 'unknown', 40,
 '- [사내 네트워크 설치](/docs/network-setup)'),
('general', 'mobile-phone', '업무용 휴대폰',
 '업무용 휴대폰 지급 대상, 통신비 지원 기준, 분실·교체 처리',
 'guide', '총무팀', 'unknown', 50, ''),
('general', 'seating', '좌석',
 '좌석 배치 원칙, 자리 이동 요청, 회의실 예약 방법',
 'guide', '총무팀', 'unknown', 60, ''),
('general', 'parking', '주차',
 '주차 등록 절차, 지원 기준, 방문객 주차 안내',
 'guide', '총무팀', 'unknown', 70, ''),

-- 규정 준수 ───────────────────────────────────────────────────
('compliance', 'mandatory-training', '법정의무교육',
 '성희롱 예방·개인정보보호·장애인 인식개선 등 법정의무교육 일정과 이수 방법',
 'guide', '인사관리실', 'unknown', 10, ''),
('compliance', 'information-security', '정보보안',
 '정보보안 정책, PC 보안 프로그램 준수 사항, 보안 사고 신고 절차',
 'rule', '보안팀', 'unknown', 20,
 '- [사내 네트워크 설치](/docs/network-setup)'),
('compliance', 'labor-council', '노사협의회',
 '노사협의회 구성과 회의 주기, 안건 제안 방법, 회의 결과 공유',
 'guide', '인사관리실', 'unknown', 30, ''),
('compliance', 'disciplinary', '징계',
 '징계 사유와 종류, 징계위원회 절차, 소명 기회와 재심',
 'rule', '인사관리실', 'unknown', 40,
 '- [이의제기](/docs/appeal)'),
('compliance', 'outside-employment', '겸업',
 '겸업·겸직 제한 범위, 사전 승인 절차',
 'rule', '인사관리실', 'unknown', 50, ''),

-- 회사 안내 ───────────────────────────────────────────────────
('about', 'company-overview', '회사 소개·연혁',
 '인라이플 소개, 주요 사업과 연혁',
 'guide', '인사관리실', 'unknown', 10, ''),
('about', 'group-structure', '계열사 구조',
 '인라이플 그룹 계열사 구성과 각 사의 역할, 합병 관련 안내',
 'guide', '인사관리실', 'unknown', 20, ''),
('about', 'org-chart', '조직도',
 '최신 조직도 확인 위치와 부서별 담당 업무',
 'guide', '인사관리실', 'unknown', 30, ''),
('about', 'ci', 'CI (기업 아이덴티티)',
 '로고·컬러 등 CI 사용 규정과 파일 다운로드 위치',
 'guide', '인사관리실', 'unknown', 40, ''),
('about', 'emergency-contacts', '비상연락망',
 '부서별 비상연락망 확인 방법과 갱신 절차',
 'guide', '인사관리실', 'unknown', 50, '')

),
ins as (
  insert into documents (category_id, slug, title, summary, body_md, doc_type, scope, source_system, owner_team, status, sort_order)
  select
    c.id, s.slug, s.title, s.summary,
    format($tpl$## 적용 범위
전 계열사 (확인 필요)

## 내용
이 문서는 **인덱스로 먼저 등록**되었습니다. %s에 대한 규정·안내의 원문 위치와 최신 개정일을 인사관리실이 확인하고 있습니다.

다룰 내용: %s

확인이 끝나면 이 자리에 요약과 신청 방법이 채워지고, 원문 링크가 연결됩니다.

## 신청 · 처리 방법
(확인 중)

## 관련 문서
%s

> 알고 계신 원문 위치나 최신 내용이 있으면 아래 "제보하기"로 알려주세요. 내용이 다를 경우 원문 규정이 우선합니다.
$tpl$, s.title, s.summary, coalesce(nullif(s.related_md, ''), '- (추가 예정)')),
    s.doc_type, '{all}'::text[], s.source_system, s.owner_team, cfg.initial_status, s.sort_order
  from stubs s
  join categories c on c.slug = s.category_slug
  cross join cfg
  on conflict (slug) do nothing
  returning id, title, summary, body_md, status
)
-- published 로 넣은 문서는 개정 이력 v1 을 함께 남긴다 (관리자 화면 publish 와 같은 형태)
insert into document_revisions (document_id, version, title, summary, body_md, change_note)
select id, 1, title, summary, body_md, '인덱스 초기 등록 (seed)'
from ins
where status = 'published';


-- ────────────────────────────────────────────────────────────────────────────
-- ▶ 확인 (이 결과가 결과창에 표시됩니다)
-- ────────────────────────────────────────────────────────────────────────────

select 'categories' as table_name, count(*) as rows from categories
union all
select 'documents (전체)', count(*) from documents
union all
select 'documents (공개)', count(*) from documents where status = 'published'
union all
select 'documents (작성 중)', count(*) from documents where status = 'draft'
union all
select 'allowed_email_domains', count(*) from allowed_email_domains;

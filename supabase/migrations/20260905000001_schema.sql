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

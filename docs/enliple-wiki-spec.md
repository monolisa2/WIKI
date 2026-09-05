# 인라이플 위키 — 개발 명세

작성: 2026-09-05 · 인사관리실
시안 파일: `enliple-wiki-skeleton.html` (임직원 화면 / 관리자 화면 토글)

## 1. 목적

그룹웨어, 네이버웍스 게시판, 아마란스, 노션, 개별 HTML 가이드에 흩어진 규정·안내 문서를 한 곳에서 검색하고, 인사관리실이 개발자 없이 직접 등록·개정할 수 있는 사내 위키.

원문을 모두 옮기는 것이 아니라 **"어디에 있고, 최신인지"를 보증하는 인덱스**가 1차 역할. 위키 자체 문서는 점진적으로 늘린다.

## 2. 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router) | 전환평가 시스템과 동일 |
| DB / 인증 | Supabase | Postgres + Auth + Storage |
| 배포 | Vercel | |
| 스타일 | Tailwind | 시안의 토큰 값 그대로 이식 |
| 본문 편집 | Markdown | 에디터는 textarea + 미리보기로 시작, WYSIWYG는 후순위 |
| 폰트 | Pretendard Variable | jsdelivr CDN |

## 3. 화면 구성

### 3-1. 임직원 화면 `/`
- 상단: 검색 (제목·요약·본문 전문검색)
- 좌측 레일: 9개 분류 앵커
- 본문: 분류별 문서 목록. 각 행에 `문서유형` `제목` `적용범위` `요약` `원본출처` `최종개정일`
- 개정일 없는 문서는 "내용 수집 필요"로 표시 (관리자에게만 보이도록 할지 결정 필요 — 초기에는 임직원에게도 노출해 제보를 받는 방향 권장)
- 문서 상세 `/docs/[slug]`: 본문 렌더링 + 메타 + 개정 이력 접힘 + "원문 보기" 버튼

### 3-2. 관리자 화면 `/admin`
- 대시보드: 공개 중 / 작성 중 / 1년 이상 미개정 / 원본 출처 미확인
- 문서 목록: 분류·상태·적용범위 필터, 정렬
- 문서 편집: 시안 우측 패널 필드 그대로
- 분류 관리: 이름·순서·설명(hint)
- 개정 이력: 문서별 diff 보기, 특정 버전 복원

### 3-3. 인증
- 임직원 화면: Supabase Auth, 회사 도메인(`@enliple.com` 등 4사 도메인) 이메일만 가입 허용. 매직링크 로그인.
- 관리자 화면: `profiles.role = 'admin'` 인 사용자만. RLS로 강제.
- 1차 배포는 Vercel 기본 도메인 + 로그인 필수로 시작하고, 사내 도메인 연결은 이후.

## 4. 분류 체계 (9개)

| slug | 이름 | 설명 |
|---|---|---|
| start | 입사와 첫 주 | 온보딩 체크리스트, 계정 발급, 수습 전환평가, 퇴사 절차 |
| hr | 인사제도 | 취업규칙(링크만), 직급, 승진, 발령, 이의제기, 고충처리 |
| perf | 평가와 보상 | 성과관리, KPI, 연봉, 직무발명, 장기근속, 인재추천 |
| time | 근태와 휴가 | 연차, 촉진, 경조사, 유연근무, 재택, 보상휴가, 출장 |
| benefit | 복리후생 | 식권, 윙크, 복지포인트, 건강검진, 도서 |
| tools | 업무 도구 | 네이버웍스, 그룹웨어, 아마란스, 노션, 복합기, 공용계정 |
| general | 총무와 경비 | 법인카드, 명함, 장비·비품, 휴대폰, 좌석, 주차 |
| compliance | 규정 준수 | 법정의무교육, 정보보안, 노사협의회, 징계, 겸업 |
| about | 회사 안내 | 소개·연혁, 계열사 구조, 조직도, CI, 비상연락망 |

초기 문서 목록 52건은 시안 HTML의 `DATA` 배열 참조. 그대로 seed 데이터로 사용.

## 5. DB 스키마

```sql
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
```

### RLS 원칙
- `documents`: 로그인한 임직원은 `status='published'` 만 select. admin은 전체 CRUD.
- `document_revisions`, `attachments`: published 문서에 속한 것만 임직원 select. admin 전체.
- `feedback`: 임직원은 insert + 본인 것 select. admin 전체.
- `profiles`: 본인 것만 select/update. role 변경은 admin만.
- 회사 도메인 제한: `auth.users` insert 트리거에서 이메일 도메인 검사.

### 상태 규칙
- `revised_date is null` → 임직원 화면 "내용 수집 필요"
- `revised_date < now() - interval '1 year'` → 관리자 대시보드 "미개정" 카운트
- `source_system = 'unknown'` → "원본 출처 미확인" 카운트
- `doc_type = 'link'` 는 `body_md` 없이 `source_url` 필수

## 6. 문서 템플릿 (body_md 기본값)

```markdown
## 적용 범위
(전 계열사 / 특정 법인)

## 내용
...

## 신청 · 처리 방법
(경로: 그룹웨어 전자결재 > ... )

## 관련 문서
- ...

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
```

## 7. 개발 순서

1. Supabase 프로젝트 생성, 스키마·RLS 적용, seed (categories 9개 + documents 52건)
2. Next.js 프로젝트, Supabase Auth 매직링크, 도메인 제한
3. `/admin` 먼저 — 문서 CRUD, 마크다운 미리보기, publish 시 revision 스냅샷
4. `/` 임직원 화면 — 검색, 분류 목록, 상세
5. 대시보드 카운트, 피드백 폼
6. 온보딩 가이드 HTML 15건을 마크다운으로 변환해 실제 입력
7. Vercel 배포 → 본부장 리뷰 → 사내 도메인

## 8. 결정이 필요한 항목

- [ ] "내용 수집 필요" 문서를 임직원에게 노출할지 (제보 유도 vs 미완성 인상)
- [ ] 4사 도메인 목록 확정 (인증 화이트리스트)
- [ ] 합병 후 `scope` 값 정리 방식 — 통합 시 `enliple` 로 일괄 치환 or 이력 유지
- [ ] 취업규칙 원문 파일을 Storage에 올릴지, 네이버웍스 링크로만 둘지 (노무사 확인)
- [ ] 관리자 권한을 인사관리실 외 총무팀에도 줄지 (총무·경비 분류 담당)

## 9. 클로드 코드 첫 프롬프트 (참고)

> `enliple-wiki-spec.md` 와 `enliple-wiki-skeleton.html` 을 읽어줘. 명세대로 Next.js App Router + Supabase + Tailwind 프로젝트를 만들 거야. 7번 개발 순서의 1~3단계까지 먼저 진행해. 스키마는 5번 그대로 적용하고, seed 데이터는 HTML 파일의 DATA 배열에서 추출해. 디자인 토큰(색·폰트·간격)은 HTML 의 :root 변수를 Tailwind config로 옮겨.

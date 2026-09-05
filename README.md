# 인라이플 위키

그룹웨어 · 네이버웍스 게시판 · 아마란스 · 노션 · 개별 HTML 가이드에 흩어진 규정·안내 문서를 한 곳에서 검색하고,
인사관리실이 개발자 없이 직접 등록·개정하는 사내 위키. 개발 명세는 `docs/enliple-wiki-spec.md`.

## 스택

Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Tailwind v4 · Markdown 본문 · Noto Sans KR Variable · Vercel

## 진행 상태 (명세 7번 개발 순서)

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | Supabase 스키마 · RLS · seed (분류 9개 + 문서) | ✅ SQL 작성 (`supabase/`) |
| 2 | Next.js 프로젝트, 매직링크 인증, 회사 도메인 제한 | ✅ |
| 3 | `/admin` — 문서 CRUD, 마크다운 미리보기, publish 시 revision 스냅샷 | ✅ (+ 분류 관리, 개정 이력 보기·복원) |
| 4 | `/` 임직원 화면 — 통합 검색, 분류 목록, 문서 상세 | ✅ |
| 5 | 대시보드 카운트, 피드백 폼 | ✅ |
| 6 | 문서 입력 | ✅ 온보딩 가이드 13건 · 인덱스 44건 · 규정 원문 12건(계열사 취업규칙 포함) + 규정 기반 주제 안내 35건 (`seed/`) |
| 7 | Vercel 배포 → 본부장 리뷰 → 사내 도메인 | ⏳ 절차: [docs/DEPLOY.md](docs/DEPLOY.md) |

## 로컬 실행

1. Supabase 프로젝트를 만들고 SQL 을 순서대로 적용한다 (SQL Editor 또는 `psql`).

   ```
   supabase/migrations/20260905000001_schema.sql     -- 명세 5번 스키마 그대로
   supabase/migrations/20260905000002_auth.sql       -- 허용 도메인 테이블, auth 트리거, is_admin()
   supabase/migrations/20260905000003_rls.sql        -- RLS 정책
   supabase/migrations/20260905000004_functions.sql  -- publish_document(), restore_document_revision()
   supabase/migrations/20260905000005_search.sql     -- search_documents() 통합 검색
   supabase/seed.sql                                 -- 분류 9개 + 허용 도메인(enliple.com)
   supabase/seed/onboarding_todo.sql                 -- 온보딩 가이드 문서 13건 (draft)
   supabase/seed/index_stubs.sql                     -- 인덱스 문서 44건 (published · 내용 수집 필요)
   supabase/seed/regulations.sql                     -- 규정 원문 12건 + 주제별 안내 35건 (대외비 · gitignore, 비공개 전환 후 add -f)
   ```

   콘솔에서 하나씩 진행하는 상세 절차는 **[docs/DEPLOY.md](docs/DEPLOY.md)** 참고.

   Supabase CLI 를 쓴다면 `supabase init` 후 `supabase db push` 로 migrations 를, `supabase db seed` 또는 psql 로 seed 를 적용한다.

2. Supabase 대시보드 > Authentication > Emails 에서 커스텀 SMTP 를 켜고 메일 템플릿을 코드 전용으로 바꾼다 (docs/DEPLOY.md 3단계).

3. 환경변수

   ```bash
   cp .env.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 입력
   ```

4. 실행

   ```bash
   npm install
   npm run dev
   ```

5. 첫 관리자 지정: 회사 이메일로 한 번 로그인해 `profiles` 행이 생기면 SQL 로 role 을 바꾼다.

   ```sql
   update profiles set role = 'admin' where email = 'name@enliple.com';
   ```

## 인증 동작

- 이메일 코드 로그인 (`signInWithOtp` → `verifyOtp`). 비밀번호 없음. 메일 링크는 회사 메일 보안 검사가 먼저 열어 소모하는 문제가 있어 쓰지 않는다.
- 가입 허용 도메인은 `allowed_email_domains` 테이블. 로그인 화면에서 먼저 확인하고,
  `auth.users` before-insert 트리거가 최종 차단한다. 현재 `enliple.com` 만 등록 (명세 8번 "4사 도메인 확정" 후 추가).
- `/admin` 은 `profiles.role = 'admin'` 만 접근. 화면 가드 + RLS 이중 강제.

## 발행과 개정 이력

- 문서는 `draft` 로 저장되고, 편집 화면의 **발행** 버튼이 `publish_document()` 를 호출한다.
  이 함수가 한 트랜잭션에서 `document_revisions` 에 스냅샷(version N)을 남기고 `status = 'published'` 로 바꾼다.
- 공개 중인 문서를 수정한 뒤 다시 발행하면 다음 버전이 쌓인다.
- 개정 이력 화면에서 이전 버전을 **복원**하면 제목·요약·본문이 현재 문서에 덮어써지며, 다시 발행해야 임직원에게 반영된다.

## 디자인

macOS / Apple 스타일을 기준으로 잡았다. 시안 HTML 은 참고용.

- 중립 회색 바탕(`#f5f5f7`), 검정 텍스트, 헤어라인 보더, 둥근 카드, 검정 필(pill) 버튼
- 브랜드 그린은 링크·마크·포커스링 같은 액센트에만 절제해서 사용
- 상단 바와 검색 패널은 유리질(`backdrop-filter: saturate(180%) blur(20px)`) 표면
- 토큰은 `src/app/globals.css` 의 `:root` 한 블록에서만 바꾼다. Tailwind 유틸리티(`bg-surface`, `text-ink-2`, `rounded-card`, `shadow-float` …)는 `@theme inline` 으로 같은 변수를 참조한다.
- 폰트는 Pretendard Variable (jsdelivr)

### 통합 검색 (Spotlight 방식)

- 헤더의 검색 필드, 홈 상단의 큰 검색 필드, `⌘K` / `Ctrl+K` / `/` 키 어디서든 열린다.
- 입력 즉시 `/api/search` 를 호출해 문서(제목·요약·본문 전문검색 + 부분일치)와 분류를 한 패널에 보여준다. `↑↓` 이동, `↵` 열기, `esc` 닫기.
- 검색은 DB 함수 `search_documents()` 가 담당한다. security invoker 라 RLS 가 그대로 적용되어 임직원은 공개 문서만 검색된다.
- 결과의 하이라이트는 `ts_headline` 의 `⟦ ⟧` 마커를 클라이언트에서 `<mark>` 로 바꿔 그린다 (HTML 은 주입하지 않음).

### 노션형 화면과 본문 작성 규칙

- 홈은 분류별 "이모지 + 제목" 링크 그리드(포털형). 문서·분류 아이콘은 `documents.icon` / `categories.icon` 에 이모지 한 글자로 저장하고, 비어 있으면 유형별 기본 아이콘(규정 📘 · 안내 📄 · 양식 📝 · 링크 🔗)을 쓴다.
- 문서 화면은 흰 시트 위에 아이콘 · 제목 · 인용형 요약 · 속성 줄 · 본문, 큰 화면에서는 우측에 스크롤을 따라오는 목차(제목 3개 이상일 때).
- 본문 마크다운에서 `## 제목` 은 연초록 띠 소제목으로, 인용문은 아래 규칙으로 콜아웃이 된다 (`src/lib/remark-callouts.ts`).

  | 문법 | 표시 |
  |---|---|
  | `> [!NOTE] …` | 💡 안내 (파란 배경) |
  | `> [!TIP] …` | ✅ 확인 (초록 배경) |
  | `> [!IMPORTANT] …` | ❗ 중요 (보라 배경) |
  | `> [!WARNING] …` | ⚠️ 주의 (노란 배경) |
  | `> [!CAUTION] …` | 🚫 금지 (빨간 배경) |
  | `> 🎂 …` (이모지로 시작) | 그 이모지를 아이콘으로 쓰는 기본 콜아웃 |
  | `> …` (마커 없음) | 일반 인용문 |

- 관리자 편집기는 문법을 몰라도 쓸 수 있게 툴바로 제목·목록·표·콜아웃·링크를 넣는다. "문서 링크"는 위키 문서 목록에서, "조문 링크"는 규정 → 조문 순서로 골라 넣는다. 미리보기는 우측에 실시간으로 뜬다.

## 디렉터리

```
src/app/
  (site)/                  임직원 화면
    layout.tsx             glass 헤더 + 통합 검색 Provider
    page.tsx               홈: 히어로 검색, 분류 레일, 분류별 문서 목록
    docs/[slug]/           문서 상세 · 개정 이력 · 원문 보기 · 제보
  api/search/              통합 검색 API (RLS 적용)
  login/                   매직링크 로그인
  auth/signout             로그아웃
  admin/
    page.tsx               대시보드 카운트
    docs/                  문서 목록(필터·정렬·검색) · 새 문서 · 편집 · 개정 이력
    categories/            분류 관리
src/components/            home/PortalHome(포털 홈), doc/DocView(문서 화면)+DocToc(목차), editor/MarkdownEditor(툴바 편집기)+IconField,
                           search/SearchCommand(Spotlight), SiteHeader, DocumentForm, Markdown(+remark-callouts), 배지류
src/lib/supabase/          server / client / middleware 클라이언트
supabase/migrations/       스키마 · 인증 · RLS · 함수
supabase/seed*.sql         분류 · 문서 seed
docs/                      개발 명세 · 배포 절차(DEPLOY.md)
```

# 인라이플 위키

그룹웨어 · 네이버웍스 게시판 · 아마란스 · 노션 · 개별 HTML 가이드에 흩어진 규정·안내 문서를 한 곳에서 검색하고,
인사관리실이 개발자 없이 직접 등록·개정하는 사내 위키. 개발 명세는 `docs/enliple-wiki-spec.md`.

## 스택

Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Tailwind v4 · Markdown 본문 · Pretendard Variable · Vercel

## 진행 상태 (명세 7번 개발 순서)

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | Supabase 스키마 · RLS · seed (분류 9개 + 문서) | ✅ SQL 작성 (`supabase/`) |
| 2 | Next.js 프로젝트, 매직링크 인증, 회사 도메인 제한 | ✅ |
| 3 | `/admin` — 문서 CRUD, 마크다운 미리보기, publish 시 revision 스냅샷 | ✅ (+ 분류 관리, 개정 이력 보기·복원) |
| 4 | `/` 임직원 화면 — 검색, 분류 목록, 문서 상세 | ⏳ 최소 화면만 |
| 5 | 대시보드 카운트, 피드백 폼 | 대시보드 카운트 ✅ · 피드백 ⏳ |
| 6 | 온보딩 가이드 HTML → 마크다운 | 1/15 (`supabase/seed/onboarding_todo.sql`) |
| 7 | Vercel 배포 → 본부장 리뷰 → 사내 도메인 | ⏳ |

## 로컬 실행

1. Supabase 프로젝트를 만들고 SQL 을 순서대로 적용한다 (SQL Editor 또는 `psql`).

   ```
   supabase/migrations/20260905000001_schema.sql     -- 명세 5번 스키마 그대로
   supabase/migrations/20260905000002_auth.sql       -- 허용 도메인 테이블, auth 트리거, is_admin()
   supabase/migrations/20260905000003_rls.sql        -- RLS 정책
   supabase/migrations/20260905000004_functions.sql  -- publish_document(), restore_document_revision()
   supabase/seed.sql                                 -- 분류 9개 + 허용 도메인(enliple.com)
   supabase/seed/onboarding_todo.sql                 -- 온보딩 가이드 문서 13건 (draft)
   ```

   Supabase CLI 를 쓴다면 `supabase init` 후 `supabase db push` 로 migrations 를, `supabase db seed` 또는 psql 로 seed 를 적용한다.

2. Supabase 대시보드 > Authentication > URL Configuration 에서
   Site URL 과 Redirect URLs 에 `http://localhost:3000/auth/callback` (배포 후 Vercel 도메인도) 을 추가한다.

3. 환경변수

   ```bash
   cp .env.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL 입력
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

- 매직링크(`signInWithOtp`) 로그인. 비밀번호 없음.
- 가입 허용 도메인은 `allowed_email_domains` 테이블. 로그인 화면에서 먼저 확인하고,
  `auth.users` before-insert 트리거가 최종 차단한다. 현재 `enliple.com` 만 등록 (명세 8번 "4사 도메인 확정" 후 추가).
- `/admin` 은 `profiles.role = 'admin'` 만 접근. 화면 가드 + RLS 이중 강제.

## 발행과 개정 이력

- 문서는 `draft` 로 저장되고, 편집 화면의 **발행** 버튼이 `publish_document()` 를 호출한다.
  이 함수가 한 트랜잭션에서 `document_revisions` 에 스냅샷(version N)을 남기고 `status = 'published'` 로 바꾼다.
- 공개 중인 문서를 수정한 뒤 다시 발행하면 다음 버전이 쌓인다.
- 개정 이력 화면에서 이전 버전을 **복원**하면 제목·요약·본문이 현재 문서에 덮어써지며, 다시 발행해야 임직원에게 반영된다.

## 디자인 토큰

`src/app/globals.css` 의 `:root` 블록이 시안 HTML 의 `:root` 변수를 이식하는 자리다.
지금 값은 온보딩 가이드 HTML(`신규입사자 To Do List`)의 토큰이며, `enliple-wiki-skeleton.html` 확보 후 이 블록만 교체한다.
Tailwind 유틸리티는 `@theme inline` 으로 같은 변수를 참조하므로(`bg-brand`, `text-ink-soft`, `rounded-card` 등) 색은 한 곳에서만 바꾼다.

## 디렉터리

```
src/app/
  page.tsx                 임직원 홈 (4단계 전 최소 화면)
  login/                   매직링크 로그인
  auth/callback, signout   세션 교환 · 로그아웃
  admin/
    page.tsx               대시보드 카운트
    docs/                  문서 목록(필터·정렬·검색) · 새 문서 · 편집 · 개정 이력
    categories/            분류 관리
src/components/            DocumentForm(편집+미리보기), Markdown, StatusBadge, ConfirmButton
src/lib/supabase/          server / client / middleware 클라이언트
supabase/migrations/       스키마 · 인증 · RLS · 함수
supabase/seed*.sql         분류 · 문서 seed
docs/                      개발 명세
```

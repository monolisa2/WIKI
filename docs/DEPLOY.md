# 배포 준비 절차 — Supabase · Vercel

인사관리실이 직접 진행하는 순서입니다. 코드 수정은 필요 없고, 두 서비스 콘솔에서 설정만 합니다.
소요 시간은 처음이라면 1시간 안쪽입니다.

## 0. 준비물

- GitHub `monolisa2/WIKI` 저장소 접근 권한 (Vercel 연결용)
- 회사 이메일(`@enliple.com`) — 첫 관리자 계정으로 사용
- Supabase 계정 (https://supabase.com), Vercel 계정 (https://vercel.com). 둘 다 GitHub 로그인 가능.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com/dashboard → **New project**
2. 입력값
   - Name: `enliple-wiki`
   - Database Password: 생성 후 **안전한 곳에 보관** (나중에 CLI/psql 접속에 필요)
   - Region: **Northeast Asia (Seoul)**
3. 생성이 끝나면 (1~2분) 좌측 **Project Settings → API** 에서 두 값을 복사해 둡니다.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (`service_role` 키는 이 프로젝트에서 쓰지 않습니다. 어디에도 넣지 마세요.)

## 2. 스키마 · seed 적용

좌측 **SQL Editor → New query** 에서 아래 파일 내용을 **순서대로** 하나씩 붙여 넣고 Run 합니다.
각 파일은 한 번에 실행되며, 성공하면 `Success. No rows returned` 가 뜹니다.

```
supabase/migrations/20260905000001_schema.sql     스키마
supabase/migrations/20260905000002_auth.sql       도메인 화이트리스트 · 프로필 자동 생성 · is_admin()
supabase/migrations/20260905000003_rls.sql        RLS 정책
supabase/migrations/20260905000004_functions.sql  발행 · 복원 함수
supabase/migrations/20260905000005_search.sql     통합 검색 함수
supabase/seed.sql                                 분류 9개 · 허용 도메인 enliple.com
supabase/seed/onboarding_todo.sql                 온보딩 가이드 문서 13건 (작성 중)
supabase/seed/index_stubs.sql                     인덱스 문서 44건 (공개 · 내용 수집 필요)
```

확인: **Table Editor** 에서 `categories` 9행, `documents` 57행이 보이면 정상입니다.

> Supabase CLI 를 쓸 줄 안다면 `supabase link` 후 `supabase db push` 로 migrations 를 올리고
> seed 는 `psql "$DB_URL" -f supabase/seed.sql` 식으로 적용해도 됩니다.

## 3. 인증 설정

**Authentication → Providers → Email**
- `Enable Email provider` 켜짐 (기본값)
- `Confirm email` 켜짐 (기본값). 매직링크 로그인은 이 설정 그대로 동작합니다.
- 비밀번호 로그인은 쓰지 않으므로 다른 Provider 는 건드리지 않습니다.

**Authentication → URL Configuration**
- `Site URL`: 처음에는 `http://localhost:3000`, Vercel 배포 후 배포 주소로 바꿉니다 (5단계).
- `Redirect URLs` 에 추가:
  - `http://localhost:3000/auth/callback`
  - (Vercel 배포 후) `https://<프로젝트>.vercel.app/auth/callback`
  - (사내 도메인 연결 후) `https://wiki.enliple.com/auth/callback` 등

**Authentication → Email Templates → Magic Link** (권장)

기본 템플릿은 메일을 **요청한 브라우저에서 링크를 열 때만** 로그인이 됩니다.
휴대폰 메일 앱에서 링크를 열면 실패하므로, 본문의 링크를 아래처럼 바꿔 두는 것을 권장합니다.

```html
<h2>인라이플 위키 로그인</h2>
<p>아래 버튼을 누르면 로그인됩니다. 본인이 요청한 것이 아니면 무시하세요.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">로그인</a></p>
```

**Authentication → SMTP Settings** (실사용 전 필수)

Supabase 기본 메일 발송은 **시간당 몇 통 수준으로 제한**되어 테스트에는 충분하지만 전사 로그인에는 부족합니다.
배포 전에 `Enable Custom SMTP` 를 켜고 회사 메일 서버(네이버웍스 SMTP) 또는 발송 서비스(Resend, SendGrid 등)를 연결하세요.
- 네이버웍스 SMTP: `smtp.worksmobile.com`, 포트 `465`(SSL), 계정은 발신용 회사 메일과 그 비밀번호(또는 앱 비밀번호)
- Sender email 은 `noreply@enliple.com` 같은 실제 존재하는 회사 주소로

## 4. Vercel 배포

1. https://vercel.com → **Add New… → Project** → GitHub 에서 `monolisa2/WIKI` Import
2. 설정
   - Framework Preset: **Next.js** (자동 인식)
   - Root Directory: `./` (그대로)
   - **Environment Variables** 세 개 입력
     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | 1단계에서 복사한 Project URL |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1단계에서 복사한 anon public 키 |
     | `NEXT_PUBLIC_SITE_URL` | 일단 `https://enliple-wiki.vercel.app` 처럼 예상 주소를 넣고, 배포 후 실제 주소로 수정 |
3. **Deploy** → 1~2분 뒤 `https://<프로젝트>.vercel.app` 주소가 나옵니다.
4. 배포 브랜치: Vercel 은 기본적으로 `main` 브랜치를 Production 으로 봅니다.
   현재 코드는 `claude/file-reading-collaboration-9unii6` 브랜치에 있으니 둘 중 하나를 선택하세요.
   - GitHub 에서 이 브랜치를 `main` 으로 Pull Request → Merge (권장)
   - 또는 Vercel **Settings → Git → Production Branch** 를 이 브랜치로 지정

## 5. 주소 맞추기 (Supabase ↔ Vercel)

배포 주소가 확정되면:
1. Vercel **Settings → Environment Variables** 에서 `NEXT_PUBLIC_SITE_URL` 을 실제 주소로 수정 → **Redeploy**
2. Supabase **Authentication → URL Configuration**
   - `Site URL` 을 배포 주소로
   - `Redirect URLs` 에 `https://<배포주소>/auth/callback` 추가

## 6. 첫 로그인과 관리자 지정

1. 배포 주소로 접속 → 회사 이메일 입력 → 메일의 로그인 링크 클릭
   - `@enliple.com` 이 아닌 주소는 "회사 이메일 계정으로만 로그인할 수 있습니다" 로 막힙니다.
2. 로그인 한 번 하면 `profiles` 테이블에 행이 생깁니다. Supabase **SQL Editor** 에서 관리자로 승격:
   ```sql
   update profiles set role = 'admin' where email = '본인이메일@enliple.com';
   ```
3. 다시 접속하면 상단에 **관리자** 버튼이 보입니다. `/admin` 에서 문서 편집·발행이 가능합니다.
4. 관리자를 더 추가할 때도 같은 SQL 을 실행합니다 (예: 총무팀 담당자).

## 7. 배포 후 할 일

- **온보딩 가이드 13건 발행**: `/admin/docs?status=draft` 에서 내용 확인 → 최종 개정일 입력 → **발행**
- **인덱스 문서 44건 채우기**: `/admin` 대시보드의 "원본 출처 미확인" 을 누르면 목록이 나옵니다.
  각 문서에 원본 시스템·원문 URL·최종 개정일을 채우고 **개정 발행**
- **허용 도메인 추가** (명세 8번): 나머지 3사 도메인이 정해지면
  ```sql
  insert into allowed_email_domains (domain, company) values
    ('example-mobisoft.com', 'mobisoft'),
    ('example-mobiwith.com', 'mobiwith'),
    ('example-anic.com', 'anic');
  ```
- **사내 도메인 연결**: Vercel **Settings → Domains** 에 `wiki.enliple.com` 추가 → 안내되는 CNAME 을 DNS 에 등록
  → 5단계를 새 주소로 반복

## 결정이 필요한 항목 (명세 8번) 과 현재 기본값

| 항목 | 현재 기본값 | 바꾸는 방법 |
|---|---|---|
| "내용 수집 필요" 문서를 임직원에게 노출 | **노출** (인덱스 44건 공개, 제보 유도) | 숨기려면 `update documents set status = 'draft' where source_system = 'unknown';` |
| 4사 도메인 | `enliple.com` 만 | 위 7단계 SQL |
| 취업규칙 원문 | 네이버웍스 링크 (`employment-rules` 문서에 URL 입력 필요) | Storage 업로드로 바꾸려면 첨부 기능 추가 필요 |
| 총무팀 관리자 권한 | 없음 | 6-4 처럼 role 변경 |

## 문제가 생기면

- **로그인 메일이 안 옴**: SMTP 미설정 상태의 발송 제한일 가능성이 높습니다. Authentication → Logs 확인 후 커스텀 SMTP 설정.
- **링크를 눌렀는데 "로그인 링크가 만료되었거나 올바르지 않습니다"**: Redirect URLs 에 콜백 주소가 없거나, 다른 브라우저에서 열었을 때(기본 템플릿). 3단계의 템플릿 변경으로 해결.
- **관리자 버튼이 안 보임**: `profiles.role` 이 `admin` 인지 SQL 로 확인. 변경 후 로그아웃/로그인.
- **문서가 임직원 화면에 안 보임**: 상태가 `published` 인지 확인. 작성 중(draft) 문서는 관리자만 봅니다.

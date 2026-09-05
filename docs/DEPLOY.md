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

**가장 쉬운 방법**: 좌측 **SQL Editor → New query** 에 `supabase/all_in_one.sql` 파일 내용 전체를 붙여 넣고 **Run** 을 한 번 누릅니다.
마이그레이션 5개와 seed 3개가 순서대로 들어 있고, 마지막에 확인 표(categories 9 / documents 57)가 결과창에 뜹니다.
중간에 오류가 나면 전체가 취소되므로 원인을 고친 뒤 다시 전체를 실행하면 됩니다.

파일을 나눠서 적용하고 싶다면 아래 순서대로 하나씩 붙여 넣고 Run 합니다. 성공하면 `Success. No rows returned` 가 뜹니다.

```
supabase/migrations/20260905000001_schema.sql     스키마
supabase/migrations/20260905000002_auth.sql       도메인 화이트리스트 · 프로필 자동 생성 · is_admin()
supabase/migrations/20260905000003_rls.sql        RLS 정책
supabase/migrations/20260905000004_functions.sql  발행 · 복원 함수
supabase/migrations/20260905000005_search.sql     통합 검색 함수
supabase/seed.sql                                 분류 9개 · 허용 도메인 enliple.com
supabase/seed/onboarding_todo.sql                 온보딩 가이드 문서 13건 (작성 중)
supabase/seed/index_stubs.sql                     인덱스 문서 44건 (공개 · 내용 수집 필요)
supabase/seed/regulations.sql                     규정 원문 10건 + 주제별 안내 35건 (대외비 · 저장소 비공개 후에만 커밋)
```

`regulations.sql` 은 취업규칙 등 규정 전문이 들어 있어 저장소가 **Private** 일 때만 git 에 추가합니다 (`git add -f supabase/seed/regulations.sql`).
그 전에는 파일을 직접 전달받아 SQL Editor 에 붙여 넣습니다. 이미 앞의 파일들을 적용한 프로젝트에도 그대로 실행하면 됩니다 (재실행 안전).

확인: **Table Editor** 에서 `categories` 9행, `documents` 57행(규정 seed 까지 적용하면 75행)이 보이면 정상입니다.

> Supabase CLI 를 쓸 줄 안다면 `supabase link` 후 `supabase db push` 로 migrations 를 올리고
> seed 는 `psql "$DB_URL" -f supabase/seed.sql` 식으로 적용해도 됩니다.

## 3. 인증 설정

**Authentication → Providers → Email**
- `Enable Email provider` 켜짐 (기본값)
- `Confirm email` 켜짐 (기본값). 매직링크 로그인은 이 설정 그대로 동작합니다.
- 비밀번호 로그인은 쓰지 않으므로 다른 Provider 는 건드리지 않습니다.

**Authentication → URL Configuration**
- `Site URL`: 배포 주소 (예: `https://enliple-wiki.vercel.app`). 메일 템플릿 변수로 쓰일 수 있어 맞춰 둡니다.
- `Redirect URLs`: 코드 입력 로그인만 쓰므로 필수는 아닙니다. 비워 두어도 됩니다.

**Authentication → Emails → SMTP Settings** (로그인 안정화를 위해 사실상 필수)

Supabase 기본 메일 발송은 두 가지 한계가 있습니다.
- 시간당 몇 통 수준으로 발송이 제한되어 여러 명이 로그인하면 메일이 오지 않습니다.
- 커스텀 SMTP 를 켜기 전에는 메일 템플릿을 수정할 수 없습니다. 기본 템플릿은 "한 번만 쓸 수 있는 링크"만 보내는데,
  회사 메일의 보안 검사가 링크를 먼저 열어보면 링크가 소모되어 `otp_expired` 오류가 납니다.

`Enable Custom SMTP` 를 켜고 네이버웍스 메일을 연결합니다.

| 항목 | 값 |
|---|---|
| Sender email | 발신에 쓸 실제 네이버웍스 계정 (예: `mcshin@enliple.com`, 가능하면 `wiki@enliple.com` 같은 전용 계정) |
| Sender name | `인라이플 위키` |
| Host | `smtp.worksmobile.com` |
| Port | `465` |
| Username | Sender email 과 같은 전체 주소 |
| Password | 그 계정의 네이버웍스 비밀번호. 2단계 인증을 쓰는 계정이면 네이버웍스 **환경설정 → 보안 → 앱 비밀번호** 에서 만든 앱 비밀번호 |

네이버웍스 관리자 콘솔에서 해당 계정의 **IMAP/SMTP(외부 메일 프로그램) 사용**이 허용되어 있어야 합니다.
저장 후 **Authentication → Rate Limits** 에서 이메일 발송 한도(기본 30/시간)를 필요에 맞게 올립니다.

**Authentication → Emails → Templates → Magic link or OTP** (SMTP 설정 후)

로그인은 **메일로 받은 숫자 코드 입력**으로만 합니다. 링크는 회사 메일의 보안 검사가 먼저 열어 소모하는 문제가 있어 쓰지 않습니다.
Subject 와 Body 를 아래로 바꿉니다.

Subject:
```
[인라이플 위키] 로그인 코드 {{ .Token }}
```

Body (Source 모드에서 붙여 넣기):
```html
<h2>인라이플 위키 로그인</h2>
<p>로그인 화면에 아래 코드를 입력하세요.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0">{{ .Token }}</p>
<p style="color:#6e6e73;font-size:12px">본인이 요청한 것이 아니면 이 메일을 무시하세요. 코드는 1시간 동안 유효합니다.</p>
```

**Confirm sign up** 템플릿도 같은 내용으로 바꿔 둡니다 (처음 가입하는 사용자에게 이 템플릿이 나갈 수 있음).

코드 자릿수는 **Authentication → Sign In / Providers → Email → Email OTP Length** 에서 정합니다 (새 프로젝트 기본값 8).
로그인 화면은 6~10자리를 모두 받습니다.

## 4. Vercel 배포

1. https://vercel.com → **Add New… → Project** → GitHub 에서 `monolisa2/WIKI` Import
2. 설정
   - Framework Preset: **Next.js** (자동 인식)
   - Root Directory: `./` (그대로)
   - **Environment Variables** 두 개 입력
     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | 1단계에서 복사한 Project URL |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1단계에서 복사한 anon public 키 (새 대시보드에서는 `sb_publishable_…` 로 시작하는 Publishable key 도 가능) |

     배포 주소는 앱이 요청 헤더에서 자동으로 알아내므로 미리 넣을 필요가 없습니다.
     (사내 도메인 등으로 고정하고 싶을 때만 `NEXT_PUBLIC_SITE_URL` 추가)
3. **Deploy** → 1~2분 뒤 `https://<프로젝트>.vercel.app` 주소가 나옵니다.
4. 배포 브랜치: Vercel 은 기본적으로 `main` 브랜치를 Production 으로 봅니다.
   현재 코드는 `claude/file-reading-collaboration-9unii6` 브랜치에 있으니 둘 중 하나를 선택하세요.
   - GitHub 에서 이 브랜치를 `main` 으로 Pull Request → Merge (권장)
   - 또는 Vercel **Settings → Git → Production Branch** 를 이 브랜치로 지정

## 5. 주소 맞추기 (Supabase 에 배포 주소 등록)

배포 주소가 나오면 Supabase **Authentication → URL Configuration** 의 `Site URL` 을 배포 주소로 맞춥니다
(예: `https://enliple-wiki.vercel.app`). Vercel 쪽은 바꿀 것이 없습니다.

## 6. 첫 로그인과 관리자 지정

1. 배포 주소로 접속 → 회사 이메일 입력 → 메일로 받은 숫자 코드 입력
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
- **코드가 맞지 않거나 만료되었다고 나옴**: 여러 번 요청했다면 가장 마지막 메일의 코드만 유효. 코드는 1시간 유효. 자릿수가 잘리지 않게 그대로 입력.
- **메일 발송 실패 `535 Username and Password not accepted`**: 네이버웍스는 일반 비밀번호가 아닌 **외부 앱 비밀번호**(환경설정 → 보안)를 SMTP Password 에 넣어야 함.
- **관리자 버튼이 안 보임**: `profiles.role` 이 `admin` 인지 SQL 로 확인. 변경 후 로그아웃/로그인.
- **문서가 임직원 화면에 안 보임**: 상태가 `published` 인지 확인. 작성 중(draft) 문서는 관리자만 봅니다.

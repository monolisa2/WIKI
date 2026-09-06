# 인라이플 위키 — 작업 인수인계 (2026-09-07 새벽 기준)

새 세션에서 이 저장소를 이어서 작업할 때 먼저 읽는 문서입니다. 명세는 `docs/enliple-wiki-spec.md`, 배포 절차는 `docs/DEPLOY.md`.

## 한눈에 보기

- 배포: https://enliple-wiki.vercel.app (Vercel, 브랜치 `claude/file-reading-collaboration-9unii6` = 기본 브랜치, 푸시하면 자동 배포). **주의**: 세션이 다른 작업 브랜치를 지정받으면 거기 푸시한 것만으로는 배포되지 않는다. 2026-09-06 밤에 그 문제로 연동 블록이 `[[live:…]]` 글자로 보였고, 사용자 승인을 받아 기본 브랜치를 작업 브랜치 커밋으로 fast-forward 했다. 새 세션은 작업이 끝나면 **기본 브랜치 반영 여부를 사용자에게 확인**한다.
- DB/인증/파일: Supabase 프로젝트 `mxinyppssadpmuyowwdc`. 로그인은 회사 이메일 **코드(OTP)** 방식만 사용 (매직링크 폐기).
- 관리자: mcshin@enliple.com (인사관리실). 편집 화면 `/admin`.
- 스택: Next.js 15 App Router · React 19 · Tailwind v4 · Supabase(Postgres+Auth+Storage) · **SUITE 글꼴**(`src/app/fonts/*.woff2`, next/font/local, OFL) · react-markdown + remark-gfm + rehype-slug + 자체 콜아웃 플러그인(`src/lib/remark-callouts.ts`).

## 지금까지 만든 것

| 영역 | 내용 | 위치 |
|---|---|---|
| 홈 | 노션형 포털: 로고 + Spotlight 검색 + 인사말 + 대외비 콜아웃 + 분류별 "이모지+제목" 링크 그리드(3단) | `src/components/home/PortalHome.tsx` |
| 문서 | 흰 시트, 큰 이모지 아이콘, 인용형 요약, 속성 줄, **첨부 파일 상자**, 본문, 우측 고정 목차(제목 3개 이상일 때), 개정 이력, 제보 | `src/components/doc/DocView.tsx`, `DocToc.tsx`, `AttachmentList.tsx` |
| 본문 문법 | `> [!NOTE]/[!TIP]/[!IMPORTANT]/[!WARNING]/[!CAUTION] 내용`, `> 🎂 내용`(이모지 콜아웃), h2 는 연초록 띠 | `src/lib/remark-callouts.ts`, `globals.css` |
| 검색 | `search_documents(p_query, p_limit)` RPC (제목 완전일치·접두 가산점, ⟦⟧ 하이라이트, icon 반환) | `supabase/migrations/…005_search.sql`, `…006_icons.sql` |
| 관리자 편집기 | 툴바(제목·굵게·목록·표·콜아웃·구분선·**문서 링크 선택기**·**조문 링크 선택기**·외부 링크), 좌우 실시간 미리보기, 아이콘 선택 | `src/components/editor/MarkdownEditor.tsx`, `IconField.tsx` |
| 첨부 | 비공개 Storage 버킷 `attachments` + `document_attachments` 테이블, `/api/files/[id]` 2분 서명 URL, 편집 화면 업로드 패널, `/admin/files` 일괄 등록(`slug__파일명.ext`) | `…007_attachments.sql`, `src/components/admin/*`, `src/lib/files.ts` |
| 브랜드 | CI 그린 `#7FBF31`, CI 블랙 `#040000`. 로고 SVG 컴포넌트, 파비콘, `public/enliple-logo.svg` | `src/components/Logo.tsx`, `src/app/icon.svg`, `globals.css` 토큰 |
| **연동 블록** | 본문에 `[[live:ninehire-letter]]` · `[[live:ninehire-news]]` · `[[live:ninehire-positions]]` · `[[live:ninehire-page:culture|mobon|mobi|mobsoft|mobwith|anick|process|home]]` · `[[live:ninehire-tabs:mobon,mobi,mobwith,mobsoft,anick]]`(탭) 한 줄을 쓰면 문서 화면에서 채용 사이트(enliple.ninehire.site) 최신 내용이 그 자리에 들어감. 서버 fetch + Next 데이터 캐시 **1시간**(`NINEHIRE_REVALIDATE`). 실패 시 원문 링크가 있는 경고 콜아웃만 표시. 페이지 블록은 나인하이어의 섹션 → 행 → 열 → 블록 구조와 **이미지·글자 크기·정렬을 그대로** 그린다(글만 뽑던 1차 버전은 어색해서 교체). 인라인 HTML 은 strong·em·br 만 남기고 이스케이프. 편집기 툴바 "🔄 연동 블록" 버튼, 미리보기는 칩으로 표시 | `src/lib/live-blocks.ts`(토큰 파서), `src/lib/ninehire.ts`(HTML의 `__NEXT_DATA__` 파싱 + 공개 API), `src/components/doc/LiveBlock.tsx`, `DocBody.tsx` |
| **연동 블록 렌더러** | 채용 사이트 페이지를 섹션→행→열→블록 구조·이미지·글자 크기·정렬 그대로 그림(`nh-*` CSS). 인라인 HTML 은 `<strong> <em> <br>` 만 남기고 이스케이프. `[[live:ninehire-tabs:a,b,c]]` 는 클라이언트 탭(`LiveTabs.tsx`)으로 페이지 전환. 연동 블록은 `Suspense` 로 감싸 본문이 먼저 뜨고 뒤따라 채워짐 | `src/lib/ninehire.ts`, `src/components/doc/LiveBlock.tsx`, `LiveTabs.tsx`, `DocBody.tsx` |
| **임베드 블록** | `[[live:embed:approval-kiosk]]` → `public/tools/approval-kiosk.html`(회계팀 배포 HTML, 외부 의존 없음, 108건)을 같은 출처 iframe 으로. `.html` 은 미들웨어 매처에 걸려 로그인 필수. 새 도구는 `EMBEDS` 에 추가 | `src/lib/live-blocks.ts`, `LiveBlock.tsx` |
| 표 렌더링 | 마크다운 표를 `.table-wrap` 으로 감싸 테두리·배경이 내용 폭만큼만 그려지던(잘린 듯 보이던) 문제 해결 | `Markdown.tsx`, `globals.css` |
| 미공개 문서 링크 | 본문이 링크한 문서가 현재 사용자에게 보이지 않으면(초안 등) 링크 대신 회색 글자 + "준비 중" 칩. 문서 페이지가 링크된 slug 를 RLS 하에서 조회해 없는 것을 `missingSlugs` 로 넘김 | `src/app/(site)/docs/[slug]/page.tsx`, `src/components/Markdown.tsx` |

## DB 상태 (사용자가 SQL Editor 에서 실행한 순서)

1. `supabase/all_in_one.sql` (스키마·RLS·함수·분류·인덱스 문서 44건·온보딩 초안 13건)
2. `regulations.sql` (규정 전문 + 주제별 안내, **저장소에 없음**, 아래 "대외비 파일" 참고)
3. `welfare_update.sql`, `batch3_update.sql`, `batch4_update.sql` (증분)
4. `20260905000006_icons.sql` (아이콘 컬럼·기본 이모지·검색 함수 교체)
5. `20260905000007_attachments.sql` (첨부 테이블·버킷·정책)
6. `batch5_update.sql` (회사 소개·연혁, 계열사 구조 초안, referral 포지션 표) — 7번이 덮어쓰므로 건너뛰어도 됨
7. **`batch6_update.sql`** — 조직문화 분류(`culture`, 🌿) 신설 + `newsletter`(열일레터, 연동) · `how-we-work`(인라이플 컬처, 연동) · `training-contents`(교육 콘텐츠, 자리만) 신규, `company-overview` · `group-structure` · `referral` 를 안내게시판 톤으로 간결화하고 연동 블록 적용, 인덕스 스텁 15건 본문을 한 줄 + 관련 문서로 정리 — **사용자 실행 필요 (코드 배포 후)**
8. `publish_onboarding.sql` (선택) — 온보딩 초안 13건 일괄 공개. 아래 "보이지 않는데 링크는 되는 문서" 참고
9. `batch7_update.sql` — 계열사 구조의 회사별 소개를 `[[live:ninehire-tabs:…]]` 탭 하나로
12. **`supabase/migrations/20260907000008_search_rank.sql`** — 검색 순위: 규정 전문보다 안내·양식 +0.5, 필독 +0.3 (SQL Editor 에서 실행)
13. **`batch10_update.sql`** — 주제별 안내 26건의 doc_type 을 rule → guide 로(규정 배지는 규정 전문 14건에만), 규정 전문 아이콘 📘 통일
11. **`batch9_update.sql`** — 네이버웍스 공지 반영: `condolence-flowers`(경조화환 발송 기준, 총무팀 2026-07-01), `childcare-tax-exemption`(보육수당 비과세, 인사관리실 2026-07-02), `amaranth-guide`(아마란스10 가이드 ver.1 요약, 스텁 채움), `approval-authority`(위임전결 기준·결재라인, 회계팀 2026-07-01, 조회 도구 임베드), `family-events` 화환 행에 신청 경로·링크 추가. 첨부 5개는 `wiki_attachments_batch9.zip` 을 `/admin/files` 에서 일괄 등록
10. **`batch8_update.sql`** — 문서 55건 끝의 반복 면책 인용문 제거(푸터에 같은 문구), "확인 중"·"반영할 예정" 운영 메모 12곳을 확정 문장으로. 기념일 축하금 지급 대상은 **공지 기준(입사 1년 이상 정규직)** 으로 적었으니 인사관리실이 규정(3개월)과 어느 쪽이 맞는지 최종 확인
9. **`batch7_update.sql`** — 계열사 구조 문서의 회사별 소개를 탭 블록 하나로 교체 — **사용자 실행 필요 (탭 코드 배포 후)**

기대 상태: 7번까지 문서 88 / 공개 73 / "내용 수집 필요" 33, 8번까지 하면 공개 86. 로컬 검증으로 8번까지 적용 시 링크 439개 / 깨진 링크 0 확인함. **7번은 연동 블록을 렌더하는 코드가 배포된 뒤 실행**해야 한다(먼저 실행하면 `[[live:…]]` 글자가 그대로 보임).

### 네이버웍스 게시판 글 (사용자 요청 2026-09-06)
사용자가 준 board.worksmobile.com 링크 5개는 로그인 벽(auth.worksmobile.com 으로 리다이렉트)이라 세션에서 읽을 수 없다. 이 환경은 원격 컨테이너여서 사용자 PC 를 조작할 수도 없다. 받는 방법: 사용자가 게시글을 열어 **인쇄 → PDF 저장**(또는 전체 스크린샷) + 첨부 파일 다운로드 후 업로드. 이미지형 안내(포스터·제도표)는 원본 이미지 파일로 받아 문서 첨부 또는 본문 이미지로 쓴다. 이전 세션 zip 에는 이미지가 없었다(규정 docx 안의 그림은 회사 로고 1장뿐).

### "보이지 않는데 링크는 되는 문서" 정리 (사용자 질문 2026-09-06)
- 신규입사자 To Do List, 사내 네트워크 설치 등 **온보딩 13건은 `draft`(작성 중)** 상태다. 임직원 RLS 는 published 만 보여주므로 일반 화면에서는 404 처럼 보이고, 관리자에게만 보인다.
- 반면 그 문서들을 링크한 계정 발급·식권 안내 등은 **published 인덱스 스텁**이어서 링크만 먼저 노출됐다.
- 조치: (1) 코드 — 보이지 않는 문서로 가는 링크는 이제 "준비 중" 칩으로 바뀐다. (2) 데이터 — 내용은 이미 작성돼 있으니 `/admin` 에서 확인 후 `publish_onboarding.sql` 로 한 번에 공개하면 링크가 살아난다. (3) 스텁 문서의 긴 안내문("인덕스로 먼저 등록…", "(확인 중)")은 batch6 에서 한 줄로 줄였다.

## 대외비 파일 (저장소가 Public 이라 커밋하지 않음)

규정 전문이 들어간 seed SQL 은 `.gitignore` 로 제외되어 있다: `supabase/seed/regulations.sql`, `welfare_update.sql`, `batch3_update.sql`, `batch4_update.sql`, `batch5_update.sql`(내부 포상금 표 포함이라 같은 취급).
저장소를 **Private 으로 전환한 뒤** `git add -f` 로 추가한다. 생성기(`gen_seed.py`)와 규정 마크다운(`md/`)은 세션 스크래치패드에 있었고, 사용자에게 `wiki-tooling.zip` 으로 전달했다. 새 세션에서는 그 zip 을 업로드받아 `scratchpad/rules/` 에 풀면 같은 파이프라인을 쓸 수 있다. 2026-09-06 세션에서 갱신본 **`wiki-tooling-v2.zip`** 을 전달했다(회사 안내 문서 정의 `company_guides.py`, 채용 사이트 스냅샷 `sources/`, 수정된 `validate.sh`·`linkcheck.py`, `batch5_update.sql` 포함). 다음 세션은 v2 를 쓴다.

파이프라인: 업로드 파일 → 텍스트 추출(`docx2md.py`, `hwp2txt.py`, pypdf layout, pymupdf) → `gen_seed.py` 에 REGS/GUIDES 추가(회사 안내 분류는 `company_guides.py`) → `python3 gen_seed.py all regulations.sql` 과 `CHANGE_NOTE="개정 이력 메모" python3 gen_seed.py "slug1,slug2" batchN_update.sql` → 로컬 Postgres 로 검증(`validate.sh`, `auth_stub.sql`, `linkcheck.py`) → 증분 SQL **파일**로 전달(사용자 선호: 파일, 인라인 텍스트 아님).

로컬 Postgres 요령(이 원격 환경): `pg_ctlcluster 16 main start` → `sudo -u postgres psql -c "alter user postgres password 'postgres'"` → `validate.sh` 는 `PGPASSWORD=postgres` 로 접속하고, `all_in_one.sql` 에 006_icons 가 이미 포함되어 있어 `regulations.sql` 적용 전에 `search_documents(text,int)` 를 drop 한 뒤 007_attachments 까지 적용한다(사용자 DB 실제 이력과 같은 최종 상태).

## 속도 점검 결과와 남은 과제 (2026-09-07)

한 것: `Markdown` 을 서버 컴포넌트로(react-markdown 이 문서 페이지 JS 에서 빠져 **157KB → 107KB**), 연동 블록 Suspense 스트리밍, `loading.tsx` 골격 화면(홈·문서), `React.cache()` 로 문서 조회(generateMetadata+page)와 나인하이어 HTML 파싱 중복 제거, 레이아웃의 `getUser()`(인증 서버 왕복)를 `getSession()` 으로(미들웨어가 이미 검증), `experimental.staleTimes.dynamic=30`(뒤로가기 즉시), 글꼴 900 굵기 제거(preload 143KB 절약).

남은 과제:
- **지역**: Supabase 프로젝트는 **서울(ap-northeast-2)** 이다(2026-09-07 사용자 대시보드 스크린샷으로 확인). Vercel 함수는 기본 `iad1`(미국 동부)이어서 DB 왕복마다 태평양을 건너던 것을 `vercel.json` 의 `regions: ["icn1"]` 로 서울에 고정했다(Hobby 플랜도 지역 1개 지정 가능). 이전 세션에서 "Supabase 도 미국 동부로 추정"이라고 적은 것은 컨테이너 프록시 지연을 잘못 읽은 것이니 무시.
- 미들웨어 `getUser()` 는 요청마다 인증 서버 왕복 1회. Supabase 의 비대칭 JWT 키(getClaims 로컬 검증)로 바꾸면 없앨 수 있다.
- 홈은 문서 86건 전체를 매 요청 조회. 문서가 수백 건이 되면 `unstable_cache` + 관리자 발행 시 `revalidateTag` 로 바꾼다.

## 구성원 관점 2차 점검에서 고친 것 (2026-09-07, 실제 화면 스크린샷 기준)
- 홈: 분류 그리드를 CSS 다단(`.home-columns`)으로 바꿔 문서 수가 다른 분류 사이 빈 공간 제거. 분류 밑 힌트 문구 제거(목록과 중복). 대외비 안내를 한 줄로.
- 검색: 결과 순서를 문서 → 분류로(Enter 가 가장 잘 맞는 문서를 열도록). 선택 행을 진한 녹색 채움 → 연한 배경+테두리로. 순위 보정 마이그레이션 008.
- 문서 유형: "경조사"·"연차" 같은 안내가 `rule`(규정 배지 📘)로 등록돼 있어 `guide` 로 정리(batch10). "규정" 배지는 이제 규정 전문에만 붙는다.
- 모바일: 표가 화면 폭에 눌려 글자가 한 자씩 꺾이던 문제 → 560px 최소 폭 + 가로 스크롤.
- 미리보기 방법(기록): 로컬 Postgres 에서 `mock2.json`(분류·문서·search_documents 결과)을 뽑아 `zz-preview` 라우트에 먹이고, Playwright `page.route('**/api/search**')` 로 검색 API 를 목 응답으로 대체하면 Supabase 없이 검색 패널까지 스크린샷할 수 있다(`rules/preview/ux_shot.js`).

## 구성원 관점 점검에서 고친 것 (2026-09-07)
- 문서 속성 줄에서 값 없는 항목("시행일 —")과 "원본 출처: 위키 자체 문서" 를 숨김. "내용 수집 필요" → "정리 중".
- 홈 하단 안내 문구를 짧게. 미공개 문서 링크는 "준비 중" 칩.
- 문서 55건 끝의 반복 면책 인용문 제거(batch8). 운영 메모 문장 12곳 정리(batch8).
- 네이버웍스 게시글은 사용자가 PDF(인쇄→PDF)·첨부로 넘겨주면 반영한다. 2026-09-07 에 5건 반영(경조화환·보육수당·아마란스 가이드·위임전결·[회계팀] 아마란스 안내 일부). **[회계팀] Amaranth 10 그룹웨어 가이드 안내** 게시글은 스크린샷이 "근태 유의사항" 중간에서 잘려 뒷부분과 첨부 2개(인사관리실_아마란스10_가이드는 받음, **[재무관리실] 더존 아마란스10 가이드 vff.pdf 는 미수령**)가 남았다. 텍스트 추출은 `pymupdf`(pip) 로.
- 아직 남은 것: (1) 온보딩 13건 공개 여부 결정(`publish_onboarding.sql`) (2) 스텁 15건·`training-contents` 등 "정리 중" 문서 채우기 (3) 네이버웍스 게시글 5건과 이미지형 안내(포스터·제도표)는 사용자가 PDF/스크린샷으로 넘겨줘야 반영 가능 (4) 규정 전문(rule) 38건은 그대로 두되, 안내 문서에서 조문 링크만 유지.

## 절대 지킬 것

- Supabase `service_role`/secret 키를 쓰지 않는다. 클라이언트는 anon 키 + RLS 만.
- 직원 개인정보(취업규칙 개정 동의서 xlsx 의 이름·사번·부서 등)는 위키에 넣지 않는다.
- 모델 식별자를 커밋 메시지·코드·PR 에 넣지 않는다.
- 글꼴은 사용자가 준 **SUITE**(OFL) woff2 를 저장소에 번들한다(`src/app/fonts/`, 400·500·600·700. 파일마다 preload 되므로 굵기 추가는 신중히). 외부 폰트 CDN 은 쓰지 않는다(SUIT GitHub CDN 은 손상된 저장소). Noto Sans KR 패키지는 제거했다.
- 빌드 후 `BUILD_EXIT` 를 확인한 뒤에만 커밋·푸시한다(과거에 grep 이 종료코드를 가려 깨진 빌드가 올라간 적 있음). `Markdown.tsx` 에 `"use client"` 를 다시 넣지 않는다(문서 페이지 JS 가 50KB 늘어난다).
- 문서 본문 톤: 안내게시판. "확인 중", "반영할 예정", 출처·표기 메모는 본문에 쓰지 않고 HANDOFF 에만 적는다. `gen_seed.py` 의 FOOT 는 비워 두었다.
- 사용자에게 다음에 할 일을 항상 즉시 알려준다. SQL 은 파일로 준다.

## 사용자(인사관리실) 쪽 미결 사항

- GitHub 저장소 monolisa2/WIKI Private 전환 → 대외비 seed 4개 `git add -f` 커밋.
- `/admin` 에서 온보딩 초안 13건 공개, 임원보수·임원퇴직금 규정 초안 2건 공개 여부 결정.
- "내용 수집 필요" 34건 자료 수집 후 문서화.
- 계열사 이메일 도메인(모비소프트·모비위드·에이닉) `allowed_email_domains` 등록. 한글 명칭은 채용 사이트·보도 기준 **에이닉(ANICK)** 으로 확정, 위키 문서도 에이닉으로 통일했다(계열사 코드 `anic` 유지).
- 코드 배포(Vercel 자동) 확인 후 `batch6_update.sql` 실행 → `/docs/newsletter`, `/docs/how-we-work`, `/docs/group-structure`, `/docs/referral` 에서 연동 블록 표시 확인. 회사 소개의 연혁은 공식 홈페이지 연혁 페이지(enliple.com/company/history)를 이 환경에서 열 수 없어 **언론 보도 기준**으로 썼다(문서에는 그 사실을 적지 않음). 인사관리실이 공식 연혁과 대조 필요.
- 교육 콘텐츠(`training-contents`)에 넣을 영상·자료 목록을 정해 채우기.
- 에이닉 취업규칙 원문 확보(위키에 없음). 계열사 현재 대표자, 2024년 보도의 '티앱스토어' 자회사 여부, 아이센드 법인 여부 확인.
- 첨부 일괄 등록: `인라이플위키_첨부파일_일괄등록.zip`(34개, 24개 문서)을 `/admin/files` 에서 올리기.
- 규정 원문 PDF 화: 지금은 원본 DOCX 가 첨부됨. 인사관리실이 워드→PDF 저장 후 편집 화면에서 교체 권장.
- Supabase 이메일 템플릿을 코드만 보이게(Magic Link/OTP·Confirm sign up), OTP 길이 6자리, SMTP 는 네이버웍스 완료.
- 전사 배포 전 Supabase/Vercel 무료 플랜 한도 점검.

## 인사팀 확인이 필요한 규정·공지 불일치

- 기념일 축하금 대상: 규정 "3개월 이상 근무" vs 공지·제도표 "입사 1년 이상".
- 리크루팅 제외 "부장급 이상" 은 공지에만 있음.
- 복직 신청 기한: 취업규칙 14일 vs 인사관리규정 1개월. 장기요양 휴직 기간도 상이.
- 계열사 배우자 출산휴가 180일 vs 법정 120일.
- 식권 문서 vs 복리후생규정 9조 표현.
- 배우자의 형제자매·조부모 사망: 취업규칙엔 경조휴가 있으나 경조사규정 표에 경조금 행 없음.
- 승진 축하금 지급 시기·방법 미확인. 건강보험 피부양자 담당자(공지: 박민희 주임) 최신 여부.

### 채용 사이트(enliple.ninehire.site) 복지 문구와 위키(규정) 대조 결과 (2026-09-06)

| 항목 | 채용 사이트·공고 | 위키(규정·공지) | 판단 |
|---|---|---|---|
| 복지포인트 상한 | Culture 페이지 "연 최소 100만원~최대 600만원", 채용 공고·모비위드 페이지 "최대 700만원" | 대표 1,000만원, 부대표·C레벨 700만원, 팀원 100/150만원 | 사이트 두 곳 표기가 서로 다름. Culture 페이지 600만원은 구 기준으로 보임 → 인사관리실이 채용 사이트 문구 정리 |
| 자격증 응시료 | "응시료 **전액** 지원" | 복리후생규정 제15조: 1회 최대 15만원, 합격자 연 2회 | 상한이 사이트에 없음 → 문구 정리 또는 규정 확인 |
| 사내 리크루팅 지급 시점 | "최종 합격 시 최대 300만원" | 3개월·6개월 근속 시 절반씩 | referral 문서에 차이를 명시함 |
| 야근 택시비 | 23시 이후 퇴근 | 복리후생규정 제10조 23시 | 일치 |
| 식대 | 점심·저녁 각 1만원, 석식은 야근 시 | 제9조 석식 21시 이후 근무 | 일치(사이트는 기준 시각 생략) |
| 장기근속 | 최대 30일·1,000만원 | 20년 30일·1,000만원 | 일치 |
| 승진 축하금 | 최소 50만원~최대 300만원 | 주임 50~임원 300만원 | 일치 |
| 생일·결혼기념일 축하금, 생일휴가, 가족 생일 조기퇴근, 창립기념일 6/20 | 15만원/10만원, 1일 유급, 연 2회 3시간 | 동일 | 일치 |
| 채용 공고 소속 | "[모비소프트] 퍼포먼스 마케터(팀장급)" 공고의 소속 필터가 **인라이플**로 등록됨 | - | 나인하이어 공고 설정 오류로 보임 → 채용 담당자(박도영 대리) 확인 |

## 다음 작업 후보

1. ~~채용 사이트 연동~~ **완료(2026-09-06)**: 열일레터·뉴스·채용 포지션·회사 페이지가 `[[live:…]]` 블록으로 자동 반영된다(1시간 캐시). 남은 것: 연동 블록 안의 이미지는 `image.ninehire.com` 을 `<img>` 로 직접 부르므로 사내망에서 막히면 깨진 아이콘이 보일 수 있음(그럴 땐 `LiveBlock.tsx` Letters 의 썸네일을 이모지로 대체). 나인하이어가 페이지 구조(`__NEXT_DATA__`)를 바꾸면 `src/lib/ninehire.ts` 의 `convertBlock` 만 손보면 된다.
1-1. **문서 톤 정리(사용자 지시)**: 위키는 사내 안내게시판이다. 정리된 최신 내용만 넣고, "위키 적용 규정", "표기 통일", "출처", "확인 필요" 같은 운영 메타 정보는 문서에 넣지 않는다(HANDOFF 에만). batch6 의 세 문서가 기준 예시. 기존 안내 39건도 같은 기준으로 다듬는 작업이 남아 있다(특히 "확인 중"·"인사관리실이 확인해 반영할 예정" 문장 제거, "근거 규정"은 한 줄 유지).
2. 회사 안내 나머지 3건(`org-chart`, `ci`, `emergency-contacts`)과 조직문화의 `training-contents`는 내부 자료가 필요해 "내용 수집 필요" 상태. CI 문서는 이미 확정된 CI 그린 `#7FBF31`·블랙 `#040000`·로고 SVG(`public/enliple-logo.svg`)로 초안을 만들 수 있다.
3. 노션형 2단계: 블록 편집기(Tiptap, 저장은 마크다운 유지) — 툴바를 써본 뒤 판단.
4. 규정 조문 접기(토글)는 페이지 내 검색·앵커 이동 문제로 보류.

## 로컬 미리보기 요령 (Supabase 없이 화면 확인)

`src/app/zz-preview/*` 에 목 데이터로 `PortalHome`/`DocView`/편집기를 렌더하는 임시 라우트를 만들고, `src/lib/supabase/middleware.ts` 의 `updateSession` 첫 줄에 `/zz-preview` 우회를 넣은 뒤 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next dev -p 3100` 을 **저장소 루트에서** 실행, playwright-core 로 스크린샷. 커밋 전에 라우트와 우회 줄을 반드시 지운다(`_` 로 시작하는 폴더는 Next 가 라우팅에서 제외하므로 `zz-` 접두를 쓴다).

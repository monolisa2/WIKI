# 다른 계정으로 작업 넘기기

새 계정에서 이 위키 작업을 이어받을 때 필요한 것만 모았습니다.
작업 내역·규칙·미결 사항은 전부 [`docs/HANDOFF.md`](HANDOFF.md) 에 있고, 이 문서는 **옮기는 절차**만 다룹니다.

---

## 1. 새 세션 첫 메시지 (그대로 복사해서 붙여넣기)

> 인라이플 사내 위키 작업을 이어서 합니다. 저장소는 `monolisa2/WIKI` 입니다.
> 시작하기 전에 `docs/HANDOFF.md` 와 `docs/HANDOVER.md` 를 먼저 읽어주세요.
>
> 꼭 지킬 것:
> - 기본 브랜치가 `claude/file-reading-collaboration-9unii6` 이고 **Vercel 이 이 브랜치를 배포**합니다. 작업 브랜치에만 푸시하면 사이트에 반영되지 않습니다.
> - Supabase `service_role` 키는 쓰지 않습니다. anon 키 + RLS 만 씁니다.
> - 저장소가 **Public** 이라 규정 전문·직원 개인정보는 커밋하지 않습니다.
> - 빌드가 성공한 것을 확인한 뒤에만 커밋·푸시합니다.

작업 도구(`wiki-tooling-v2.zip`)가 필요한 작업이면 그 zip 을 같이 올려주세요. 아래 3번 참고.

---

## 2. 계정·접근 권한

### 옮기는 것이 **Claude 계정만** 이고 GitHub·Vercel·Supabase 는 그대로인 경우

할 일은 하나입니다. 새 Claude 계정에서 GitHub 을 연결하고 `monolisa2/WIKI` 를 허용하면 됩니다.
<https://claude.ai/connect-github> 에서 계정을 연결하고, 저장소 목록에 `monolisa2/WIKI` 가 없으면 같은 화면에서 Claude GitHub App 을 그 저장소에 설치합니다.
세션이 쓸 저장소는 **세션을 시작할 때** 정해지므로, 연결을 고친 뒤에는 새 세션을 시작해야 합니다.

### 서비스 계정까지 사람이 바뀌는 경우

세 곳을 각각 넘겨야 합니다. 셋 다 상대방 계정이 먼저 있어야 초대가 됩니다.

| 서비스 | 대상 | 넘기는 방법 |
|---|---|---|
| GitHub | `monolisa2/WIKI` | 협업자로 초대(Settings → Collaborators) 하거나 저장소 소유권 이전(Settings → Transfer ownership). 이전하면 **Vercel 연결이 끊기므로** Vercel 에서 다시 연결해야 합니다. |
| Vercel | 프로젝트 `enliple-wiki` | 팀으로 옮긴 뒤 멤버 초대, 또는 새 계정에서 저장소를 다시 Import. 다시 Import 할 때는 환경변수 2개와 `regions: icn1` 설정(이미 `vercel.json` 에 있음)을 확인합니다. |
| Supabase | 프로젝트(서울 리전) | 조직 멤버로 초대(Organization → Team → Invite) 하거나 프로젝트를 다른 조직으로 이전. **DB 내용이 전부 여기 있으므로 이 이전이 제일 중요합니다.** |

도메인·메일은 그대로 둡니다. 로그인은 회사 이메일 OTP 방식이고 SMTP 는 네이버웍스로 이미 붙어 있습니다.

---

## 3. 파일로 직접 넘겨야 하는 것 (저장소에 없음)

아래 세 가지는 **GitHub 에도, 작업 컨테이너에도 없습니다.** 사용자 PC 에 받아둔 파일을 새 세션에 올려야 합니다.

| 파일 | 내용 | 없으면 생기는 일 |
|---|---|---|
| `wiki-tooling-v2.zip` | 규정 seed 생성기(`gen_seed.py`), 규정 마크다운 원본, 검증 스크립트, 채용 사이트 스냅샷 | 규정 문서를 **새로 추가·개정**할 때 파이프라인을 처음부터 다시 만들어야 함 |
| `인라이플위키_첨부파일_일괄등록.zip` | 첨부 34개 (24개 문서분) | 아직 업로드 안 됨 — `/admin/files` 에서 올리면 끝 |
| `wiki_attachments_batch9.zip` | 첨부 5개 | 위와 동일 |

### 대외비 seed SQL 은 사라졌지만 문제는 없습니다

`supabase/seed/regulations.sql`, `welfare_update.sql`, `batch3~12_update.sql` 은 저장소가 Public 이라 커밋하지 않았고, 작업 컨테이너는 주기적으로 초기화되므로 지금은 남아 있지 않습니다.
**다만 그 SQL 의 내용은 이미 전부 운영 DB 에 적용되어 있습니다.** 문서 91건이 Supabase 에 들어 있는 상태이므로 실제로 잃은 것은 없습니다.

백업이 필요하면 SQL 파일을 찾을 게 아니라 **DB 를 덤프**하는 것이 맞습니다. Supabase 대시보드 → Database → Backups 에서 받거나, 접속 정보가 있으면:

```
pg_dump "postgresql://postgres:<비밀번호>@db.<프로젝트ref>.supabase.co:5432/postgres" \
  --data-only --table=public.documents --table=public.categories \
  --table=public.document_revisions --table=public.document_attachments \
  > wiki-content-backup.sql
```

이 덤프 파일은 규정 전문이 들어가므로 **Public 저장소에 커밋하지 않습니다.**

---

## 4. 비밀값 취급

- 앱이 쓰는 환경변수는 두 개뿐입니다: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. 둘 다 Vercel 프로젝트 설정에 이미 들어 있고, Supabase 대시보드 → Project Settings → API 에서 언제든 다시 확인할 수 있습니다.
- `anon` 키는 브라우저에 노출되는 공개 키라서 유출 개념이 아니지만, **채팅창에 붙여넣지 말고** 대시보드에서 복사해 Vercel 이나 로컬 `.env.local` 에 바로 넣으세요.
- `service_role` 키는 이 프로젝트에서 쓰지 않습니다. 어디에도 넣지 마세요.
- Supabase DB 비밀번호와 네이버웍스 SMTP 비밀번호는 Claude 세션에 줄 필요가 없습니다. 필요한 작업이 생기면 사용자가 직접 콘솔에서 실행하면 됩니다.

---

## 5. 넘기는 시점의 상태

- 사이트: <https://enliple-wiki.vercel.app> 정상. 최근 작업은 504 장애 수정과 속도 개선이고 둘 다 배포 완료.
- 문서: 전체 91건 / 공개 89건.
- DB: 마이그레이션 9개 + seed 전부 적용 완료.

**바로 이어서 할 일** (자세한 내용은 `HANDOFF.md` 의 "사용자 쪽 미결 사항"):

1. 열일레터 문서를 열어 연동 블록이 제대로 뜨는지 확인 — 채용 사이트가 봇 차단을 켠 것으로 보여 내용이 안 나올 수 있음.
2. 첨부 zip 2개 `/admin/files` 에 업로드.
3. 저장소 Private 전환 여부 결정 (전환하면 규정 seed 와 DB 백업을 저장소에 둘 수 있음).
4. 전사 배포 전 Supabase 인증 메일 발송 한도 상향, Vercel·Supabase 무료 플랜 한도 점검.

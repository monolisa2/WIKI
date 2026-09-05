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

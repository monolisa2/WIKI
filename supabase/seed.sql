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

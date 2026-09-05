-- 문서·분류 아이콘 (노션형 화면): 이모지 한 글자를 저장한다. 비어 있으면 화면에서 유형별 기본 아이콘을 쓴다.
-- 재실행 안전. 검색 함수는 반환 컬럼이 늘어나므로 drop 후 재생성한다.

alter table public.categories add column if not exists icon text;
alter table public.documents  add column if not exists icon text;

-- 분류 아이콘 (항상 최신값으로 맞춘다)
update public.categories c set icon = v.icon
from (values
  ('start', '🚀'),
  ('hr', '🧭'),
  ('perf', '🏆'),
  ('time', '🗓️'),
  ('benefit', '🎁'),
  ('tools', '🧰'),
  ('general', '🏢'),
  ('compliance', '🛡️'),
  ('about', '🌱')
) as v(slug, icon)
where c.slug = v.slug;

-- 문서 아이콘: 관리자가 아직 정하지 않은 문서만 채운다
update public.documents d set icon = v.icon
from (values
  ('new-hire-todo', '✅'),
  ('account-provisioning', '🔑'),
  ('probation-review', '🎓'),
  ('offboarding', '👋'),
  ('employment-rules-guide', '📖'),
  ('job-grades', '🪜'),
  ('promotion', '🎖️'),
  ('transfer', '🔀'),
  ('appeal', '⚖️'),
  ('leave-of-absence', '⏸️'),
  ('health-insurance-dependent', '🏥'),
  ('grievance', '🤝'),
  ('form-health-insurance-dependent', '📝'),
  ('training-rules', '📚'),
  ('hr-management-rules', '📘'),
  ('employment-rules', '📘'),
  ('employment-rules-mobisoft', '📘'),
  ('employment-rules-mobiwith', '📘'),
  ('performance-management', '📈'),
  ('kpi', '🎯'),
  ('salary', '💰'),
  ('severance-pay', '💼'),
  ('employee-invention', '💡'),
  ('long-service-award', '🏅'),
  ('referral', '🙋'),
  ('form-internal-referral', '📝'),
  ('salary-rules', '📘'),
  ('executive-compensation-rules', '📘'),
  ('executive-severance-rules', '📘'),
  ('severance-pay-rules', '📘'),
  ('working-hours', '⏰'),
  ('annual-leave', '🌴'),
  ('leave-promotion', '📣'),
  ('family-events', '💐'),
  ('family-events-rules', '📘'),
  ('flexible-work', '🔄'),
  ('sick-leave', '🤒'),
  ('remote-work', '🏠'),
  ('parental-and-family-care', '👶'),
  ('compensatory-leave', '🌙'),
  ('business-trip', '✈️'),
  ('welfare-overview', '🎁'),
  ('payco-meal-ticket', '🍱'),
  ('meal-ticket-policy', '🍱'),
  ('late-night-transport', '🚕'),
  ('weinc-mall', '🛍️'),
  ('anniversary-benefits', '🎂'),
  ('form-anniversary-check', '📝'),
  ('welfare-points', '💳'),
  ('health-checkup', '🩺'),
  ('book-support', '📚'),
  ('welfare-rules', '📘'),
  ('network-setup', '🌐'),
  ('naverworks-setup', '💬'),
  ('naverworks-board', '📌'),
  ('groupware-hr-card', '🪪'),
  ('amaranth-hr-card', '🪪'),
  ('printer-office-setup', '🖨️'),
  ('notion-google-account', '🗒️'),
  ('groupware-guide', '🖥️'),
  ('amaranth-guide', '🧮'),
  ('notion-guide', '🗒️'),
  ('shared-accounts', '🔐'),
  ('business-card', '📇'),
  ('corp-card-checkout', '💳'),
  ('seal-usage', '🔏'),
  ('corporate-card-policy', '💳'),
  ('equipment', '💻'),
  ('mobile-phone', '📱'),
  ('seating', '🪑'),
  ('parking', '🅿️'),
  ('seal-management-rules', '📘'),
  ('mandatory-training', '🎓'),
  ('information-security', '🔒'),
  ('harassment-prevention', '🚫'),
  ('labor-council', '🤝'),
  ('disciplinary', '⚠️'),
  ('outside-employment', '🧾'),
  ('labor-council-rules', '📘'),
  ('ethics-code', '📘'),
  ('company-overview', '🌱'),
  ('group-structure', '🏢'),
  ('org-chart', '🗂️'),
  ('ci', '🎨'),
  ('emergency-contacts', '📞')
) as v(slug, icon)
where d.slug = v.slug and d.icon is null;

-- 나머지는 유형별 기본값
update public.documents set icon = case doc_type when 'rule' then '📘' when 'form' then '📝' when 'link' then '🔗' else '📄' end
where icon is null;

-- 검색 결과에도 아이콘을 내려준다
drop function if exists public.search_documents(text, int);

create function public.search_documents(p_query text, p_limit int default 20)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  doc_type text,
  icon text,
  scope text[],
  revised_date date,
  source_system text,
  source_url text,
  is_pinned boolean,
  category_slug text,
  category_name text,
  score real,
  headline text
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select websearch_to_tsquery('simple', p_query) as tsq,
           '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%' as pat
  )
  select
    d.id, d.slug, d.title, d.summary, d.doc_type, d.icon, d.scope, d.revised_date, d.source_system, d.source_url,
    coalesce(d.is_pinned, false),
    c.slug, c.name,
    (
      (case when d.search_vector @@ q.tsq then ts_rank(d.search_vector, q.tsq) * 4 else 0 end)
      + (case when lower(d.title) = lower(p_query) then 4.0 else 0 end)                 -- 제목 완전 일치
      + (case when d.title ilike replace(replace(p_query, '%', '\%'), '_', '\_') || '%' then 1.0 else 0 end)  -- 제목이 검색어로 시작
      + (case when d.title ilike q.pat then 2.0 else 0 end)
      + (case when d.summary ilike q.pat then 1.0 else 0 end)
      + (case when d.body_md ilike q.pat then 0.3 else 0 end)
    )::real as score,
    ts_headline(
      'simple',
      coalesce(
        nullif(d.summary, ''),
        regexp_replace(left(coalesce(d.body_md, ''), 600), '(^|\n)#+\s*|[*`>]|\[([^\]]*)\]\([^)]*\)', '\2', 'g'),
        ''
      ),
      q.tsq,
      'MaxFragments=1, MaxWords=28, MinWords=10, StartSel=⟦, StopSel=⟧'
    ) as headline
  from documents d
  join categories c on c.id = d.category_id
  cross join q
  where d.status = 'published'
    and (
      d.search_vector @@ q.tsq
      or d.title ilike q.pat
      or d.summary ilike q.pat
      or d.body_md ilike q.pat
    )
  order by score desc, coalesce(d.is_pinned, false) desc, d.title
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_documents(text, int) to authenticated;

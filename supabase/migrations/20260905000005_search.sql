-- 통합 검색: 제목·요약·본문 전문검색(simple) + 부분일치(ilike) 결합, 하이라이트 포함
-- security invoker 이므로 RLS 가 그대로 적용된다 (임직원은 published 만).

create or replace function public.search_documents(p_query text, p_limit int default 20)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  doc_type text,
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
    d.id, d.slug, d.title, d.summary, d.doc_type, d.scope, d.revised_date, d.source_system, d.source_url,
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

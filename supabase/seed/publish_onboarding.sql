-- 온보딩 초안 13건 공개 (선택 실행)
-- 공개 문서(계정 발급·식권 등)가 이 초안들을 링크하고 있어, 임직원 화면에서는 링크가 "준비 중"으로 보인다.
-- 내용을 /admin 에서 한 번 확인한 뒤 이 SQL 을 실행하면 13건이 한 번에 공개되고 개정 이력 v1 이 남는다.
with target as (
  select id, title, summary, body_md from documents
  where status = 'draft' and slug in (
    'new-hire-todo','network-setup','naverworks-setup','groupware-hr-card','amaranth-hr-card','business-card',
    'printer-office-setup','naverworks-board','notion-google-account','payco-meal-ticket','meal-ticket-policy','weinc-mall','corp-card-checkout')
),
upd as (
  update documents d set status = 'published', updated_at = now()
  from target t where d.id = t.id
  returning d.id
)
insert into document_revisions (document_id, version, title, summary, body_md, change_note)
select t.id,
       coalesce((select max(r.version) from document_revisions r where r.document_id = t.id), 0) + 1,
       t.title, t.summary, t.body_md, '온보딩 안내 공개'
from target t join upd on upd.id = t.id;

select count(*) filter (where status = 'published') as "공개 문서", count(*) as "전체 문서" from documents;

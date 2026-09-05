-- 문서 함수: updated_at 자동 갱신, publish 시 개정 이력 스냅샷

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on documents
  for each row execute function public.set_updated_at();

-- publish: status 를 published 로 바꾸고 document_revisions 에 스냅샷을 남긴다.
-- 이미 published 인 문서에 다시 호출하면 "개정 발행"으로 새 버전이 쌓인다.
create or replace function public.publish_document(p_document_id uuid, p_change_note text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc documents%rowtype;
  v_version int;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into v_doc from documents where id = p_document_id for update;
  if not found then
    raise exception 'document not found: %', p_document_id using errcode = 'P0002';
  end if;

  if v_doc.doc_type = 'link' and coalesce(v_doc.source_url, '') = '' then
    raise exception 'link 문서는 source_url 이 필요합니다' using errcode = '23514';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from document_revisions where document_id = p_document_id;

  insert into document_revisions (document_id, version, title, summary, body_md, change_note, revised_by)
  values (p_document_id, v_version, v_doc.title, v_doc.summary, v_doc.body_md, p_change_note, auth.uid());

  update documents
  set status = 'published',
      updated_by = auth.uid()
  where id = p_document_id;

  return v_version;
end;
$$;

grant execute on function public.publish_document(uuid, text) to authenticated;

-- 특정 버전 복원 (관리자 화면 "개정 이력 > 특정 버전 복원"). 복원 후에는 다시 publish 해야 반영된다.
create or replace function public.restore_document_revision(p_revision_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev document_revisions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select * into v_rev from document_revisions where id = p_revision_id;
  if not found then
    raise exception 'revision not found: %', p_revision_id using errcode = 'P0002';
  end if;

  update documents
  set title = v_rev.title,
      summary = v_rev.summary,
      body_md = v_rev.body_md,
      updated_by = auth.uid()
  where id = v_rev.document_id;
end;
$$;

grant execute on function public.restore_document_revision(bigint) to authenticated;

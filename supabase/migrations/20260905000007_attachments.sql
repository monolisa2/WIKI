-- 첨부 파일: 문서에 붙는 원문·양식 파일 (양식 엑셀, 규정 PDF 등).
-- 파일 본체는 Storage 비공개 버킷 'attachments' 에, 메타데이터는 이 테이블에 둔다.
-- 임직원은 /api/files/<id> 로 요청하고, 서버가 RLS 로 권한을 확인한 뒤 2분짜리 서명 URL 로 내려준다.
-- 재실행 안전.

create table if not exists public.document_attachments (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  storage_path text not null unique,          -- attachments 버킷 안 경로: <document_id>/<uuid>.<ext>
  file_name    text not null,                 -- 임직원에게 보이는 원래 파일 이름
  mime_type    text,
  size_bytes   bigint,
  sort_order   int default 0,
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz default now()
);
create index if not exists document_attachments_document_idx on public.document_attachments (document_id, sort_order, created_at);

alter table public.document_attachments enable row level security;

drop policy if exists "attachments: read" on public.document_attachments;
create policy "attachments: read" on public.document_attachments
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.documents d where d.id = document_id and d.status = 'published')
  );

drop policy if exists "attachments: admin write" on public.document_attachments;
create policy "attachments: admin write" on public.document_attachments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Storage 버킷 ───────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)   -- 50MB
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- 읽기: 공개 문서의 파일(경로 첫 폴더 = document_id) 또는 관리자. 서명 URL 발급에 select 권한이 필요하다.
drop policy if exists "attachments bucket: read" on storage.objects;
create policy "attachments bucket: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      public.is_admin()
      or exists (
        select 1 from public.documents d
        where d.status = 'published' and d.id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "attachments bucket: admin insert" on storage.objects;
create policy "attachments bucket: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments' and public.is_admin());

drop policy if exists "attachments bucket: admin update" on storage.objects;
create policy "attachments bucket: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'attachments' and public.is_admin());

drop policy if exists "attachments bucket: admin delete" on storage.objects;
create policy "attachments bucket: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'attachments' and public.is_admin());

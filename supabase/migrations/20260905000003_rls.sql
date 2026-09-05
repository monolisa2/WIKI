-- RLS (개발 명세 5번 "RLS 원칙")

alter table profiles enable row level security;
alter table categories enable row level security;
alter table documents enable row level security;
alter table document_revisions enable row level security;
alter table attachments enable row level security;
alter table feedback enable row level security;
alter table allowed_email_domains enable row level security;

-- profiles: 본인 것만 select/update. role 변경은 admin 만.
create policy "profiles: self select" on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: self update" on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = (select p.role from profiles p where p.id = auth.uid()))
  );

-- categories: 로그인 사용자 전체 select, admin 전체 CRUD
create policy "categories: read" on categories
  for select to authenticated using (true);
create policy "categories: admin write" on categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- documents: 임직원은 published 만 select. admin 은 전체 CRUD.
create policy "documents: read published" on documents
  for select to authenticated
  using (status = 'published' or public.is_admin());
create policy "documents: admin write" on documents
  for insert to authenticated with check (public.is_admin());
create policy "documents: admin update" on documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "documents: admin delete" on documents
  for delete to authenticated using (public.is_admin());

-- document_revisions / attachments: published 문서에 속한 것만 임직원 select. admin 전체.
create policy "revisions: read" on document_revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from documents d where d.id = document_id and d.status = 'published')
  );
create policy "revisions: admin write" on document_revisions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "attachments: read" on attachments
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from documents d where d.id = document_id and d.status = 'published')
  );
create policy "attachments: admin write" on attachments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- feedback: 임직원은 insert + 본인 것 select. admin 전체.
create policy "feedback: insert own" on feedback
  for insert to authenticated with check (submitted_by = auth.uid());
create policy "feedback: read own" on feedback
  for select to authenticated using (submitted_by = auth.uid() or public.is_admin());
create policy "feedback: admin update" on feedback
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "feedback: admin delete" on feedback
  for delete to authenticated using (public.is_admin());

-- allowed_email_domains: 로그인 화면 사전 검사를 위해 읽기는 공개, 변경은 admin
create policy "domains: read" on allowed_email_domains
  for select to anon, authenticated using (true);
create policy "domains: admin write" on allowed_email_domains
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

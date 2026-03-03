
create table public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references procurement_documents(id) on delete cascade not null,
  created_by uuid references auth.users(id),
  content jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.audit_reports enable row level security;

create policy "Authenticated users can manage audit reports"
  on public.audit_reports for all to authenticated
  using (true) with check (true);

create trigger update_audit_reports_updated_at
  before update on public.audit_reports
  for each row
  execute function public.update_updated_at_column();

-- 1) Make pdf-chunks bucket private
update storage.buckets set public = false where id = 'pdf-chunks';

-- Drop existing public-read policy on pdf-chunks (created earlier)
drop policy if exists "Public read pdf-chunks" on storage.objects;
drop policy if exists "Authenticated can read pdf-chunks" on storage.objects;

-- (No need to add a SELECT policy for clients; access is via signed URLs from edge functions using service role.)

-- 2) Documents bucket: restrict overwrites to admin/gestor
drop policy if exists "Admin/Gestor can update documents" on storage.objects;
create policy "Admin/Gestor can update documents"
on storage.objects for update to authenticated
using (bucket_id = 'documents' and public.has_any_role(auth.uid(), array['admin'::app_role,'gestor'::app_role]))
with check (bucket_id = 'documents' and public.has_any_role(auth.uid(), array['admin'::app_role,'gestor'::app_role]));

-- 3) Replace client INSERT on audit_logs with a SECURITY DEFINER function
drop policy if exists "Authenticated can insert logs" on public.audit_logs;

create or replace function public.log_audit_event(
  _action text,
  _resource_type text,
  _resource_id uuid default null,
  _details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if _action is null or length(_action) = 0 or length(_action) > 100 then
    raise exception 'Invalid action';
  end if;
  if _resource_type is null or length(_resource_type) = 0 or length(_resource_type) > 100 then
    raise exception 'Invalid resource_type';
  end if;

  insert into public.audit_logs (action, resource_type, resource_id, user_id, details)
  values (_action, _resource_type, _resource_id, auth.uid(), coalesce(_details, '{}'::jsonb))
  returning id into _id;

  return _id;
end;
$$;

revoke all on function public.log_audit_event(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;
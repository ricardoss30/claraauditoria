
-- 1) Prevent gestors from inserting admin role (privilege escalation fix)
DROP POLICY IF EXISTS "Gestors can insert roles" ON public.user_roles;
CREATE POLICY "Gestors can insert non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'gestor'::app_role)
  AND role <> 'admin'::app_role
);

-- Also tighten gestor DELETE to prevent removing admins
DROP POLICY IF EXISTS "Gestors can delete roles" ON public.user_roles;
CREATE POLICY "Gestors can delete non-admin roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor'::app_role)
  AND role <> 'admin'::app_role
);

-- 2) Restrict conhecimento_chunks SELECT to authenticated role only (not public)
DROP POLICY IF EXISTS "Authenticated can view chunks" ON public.conhecimento_chunks;
CREATE POLICY "Authenticated can view chunks"
ON public.conhecimento_chunks
FOR SELECT
TO authenticated
USING (true);

-- 3) Tighten storage policies for base_conhecimento bucket: restrict writes to admin/gestor
DROP POLICY IF EXISTS "Authenticated users can upload to base_conhecimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from base_conhecimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update base_conhecimento" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete" ON storage.objects;

CREATE POLICY "Admin/Gestor can upload to base_conhecimento"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'base_conhecimento'
  AND public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[])
);

CREATE POLICY "Admin/Gestor can update base_conhecimento"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'base_conhecimento'
  AND public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[])
);

CREATE POLICY "Admin/Gestor can delete from base_conhecimento"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'base_conhecimento'
  AND public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[])
);

-- 4) Restrict deletes on 'documents' bucket to admin/gestor (was open to any authenticated)
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Admin/Gestor can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[])
);


-- Fix audit_logs: add INSERT policy scoped to authenticated (writes also go via SECURITY DEFINER log_audit_event)
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix audit_reports: re-scope all policies to authenticated only
DROP POLICY IF EXISTS "Admins can delete reports" ON public.audit_reports;
DROP POLICY IF EXISTS "Authorized users can create audit reports" ON public.audit_reports;
DROP POLICY IF EXISTS "Authorized users can view audit reports" ON public.audit_reports;
DROP POLICY IF EXISTS "Creator or admin can update reports" ON public.audit_reports;

CREATE POLICY "Admins can delete reports"
ON public.audit_reports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authorized users can create audit reports"
ON public.audit_reports
FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'auditor'::app_role]));

CREATE POLICY "Authorized users can view audit reports"
ON public.audit_reports
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'auditor'::app_role]));

CREATE POLICY "Creator or admin can update reports"
ON public.audit_reports
FOR UPDATE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix setting_versions: re-scope policy to authenticated
DROP POLICY IF EXISTS "Admin can manage versions" ON public.setting_versions;

CREATE POLICY "Admin can manage versions"
ON public.setting_versions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix document_chunks: add SELECT policy for authorized roles (edge functions use service_role and bypass RLS)
CREATE POLICY "Authorized users can view document chunks"
ON public.document_chunks
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'auditor'::app_role]));

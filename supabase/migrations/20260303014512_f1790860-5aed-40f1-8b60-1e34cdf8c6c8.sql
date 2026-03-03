
-- Fix #1: Replace permissive audit_reports RLS policy with role-based policies
DROP POLICY IF EXISTS "Authenticated users can manage audit reports" ON public.audit_reports;

CREATE POLICY "Authorized users can view audit reports"
  ON public.audit_reports FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'auditor']::app_role[]));

CREATE POLICY "Authorized users can create audit reports"
  ON public.audit_reports FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'auditor']::app_role[]));

CREATE POLICY "Creator or admin can update reports"
  ON public.audit_reports FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reports"
  ON public.audit_reports FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix #3: Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

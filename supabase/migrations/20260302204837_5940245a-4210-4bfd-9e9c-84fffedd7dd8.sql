
-- Allow gestors to view all user_roles (needed for UsersManagement)
CREATE POLICY "Gestors can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestors to insert roles (but not admin role - enforced in app)
CREATE POLICY "Gestors can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestors to delete roles (but not admin role - enforced in app)
CREATE POLICY "Gestors can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestors to manage risk_rules
CREATE POLICY "Gestors can manage rules"
ON public.risk_rules
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestors to view audit logs
CREATE POLICY "Gestors can view logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestors to update profiles of other users (for editing auditor names)
CREATE POLICY "Gestors can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

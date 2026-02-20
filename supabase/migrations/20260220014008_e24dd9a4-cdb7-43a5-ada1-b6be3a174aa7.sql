CREATE POLICY "Admin can delete alerts"
ON public.risk_alerts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
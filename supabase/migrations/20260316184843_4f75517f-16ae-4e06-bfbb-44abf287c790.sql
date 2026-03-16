CREATE POLICY "Gestor can delete documents"
ON procurement_documents FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestor can delete alerts"
ON risk_alerts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));
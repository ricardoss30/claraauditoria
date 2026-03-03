-- Add assigned_to column to risk_alerts for alert assignment workflow
ALTER TABLE public.risk_alerts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Create index for faster lookups by assigned user
CREATE INDEX IF NOT EXISTS idx_risk_alerts_assigned_to ON public.risk_alerts(assigned_to);


ALTER TABLE public.risk_rules ADD COLUMN rule_scope text NOT NULL DEFAULT 'risk';

UPDATE public.risk_rules SET rule_scope = 'analysis' WHERE name LIKE '#%';

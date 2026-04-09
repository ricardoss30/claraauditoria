
-- Create rule_categories table
CREATE TABLE public.rule_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  scope text NOT NULL DEFAULT 'risk',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, scope)
);

ALTER TABLE public.rule_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view categories"
  ON public.rule_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON public.rule_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestor can manage categories"
  ON public.rule_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Create rule_types table
CREATE TABLE public.rule_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  scope text NOT NULL DEFAULT 'risk',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, scope)
);

ALTER TABLE public.rule_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view types"
  ON public.rule_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage types"
  ON public.rule_types FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestor can manage types"
  ON public.rule_types FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Seed categories for both scopes
INSERT INTO public.rule_categories (name, label, scope) VALUES
  ('sobrepreco', 'Sobrepreço', 'risk'),
  ('direcionamento', 'Direcionamento', 'risk'),
  ('prazo_exiguo', 'Prazo Exíguo', 'risk'),
  ('outro', 'Outro', 'risk'),
  ('sobrepreco', 'Sobrepreço', 'analysis'),
  ('direcionamento', 'Direcionamento', 'analysis'),
  ('prazo_exiguo', 'Prazo Exíguo', 'analysis'),
  ('outro', 'Outro', 'analysis');

-- Seed types for both scopes
INSERT INTO public.rule_types (name, label, scope) VALUES
  ('keyword', 'Palavra-chave', 'risk'),
  ('numeric', 'Numérico', 'risk'),
  ('pattern', 'Padrão', 'risk'),
  ('ai', 'IA', 'risk'),
  ('keyword', 'Palavra-chave', 'analysis'),
  ('numeric', 'Numérico', 'analysis'),
  ('pattern', 'Padrão', 'analysis'),
  ('ai', 'IA', 'analysis');

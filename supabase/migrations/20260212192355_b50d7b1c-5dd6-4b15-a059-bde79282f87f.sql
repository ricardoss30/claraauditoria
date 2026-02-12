
-- ============================================
-- CLARA - Fase 1: Estrutura Base
-- ============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'auditor');
CREATE TYPE public.processing_status AS ENUM ('pending', 'processing', 'processed', 'error');
CREATE TYPE public.alert_status AS ENUM ('pending', 'under_review', 'confirmed', 'dismissed');

-- 2. TABELAS

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Data Sources
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'api',
  base_url TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Procurement Documents
CREATE TABLE public.procurement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.data_sources(id),
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  modality TEXT,
  agency TEXT,
  estimated_value NUMERIC,
  published_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  raw_content TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  status public.processing_status NOT NULL DEFAULT 'pending',
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk Rules
CREATE TABLE public.risk_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL DEFAULT 'keyword',
  category TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 3 CHECK (severity >= 1 AND severity <= 5),
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk Alerts
CREATE TABLE public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.procurement_documents(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.risk_rules(id),
  alert_type TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 3 CHECK (severity >= 1 AND severity <= 5),
  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT,
  status public.alert_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Text Analysis Cache
CREATE TABLE public.text_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.procurement_documents(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_procurement_documents_status ON public.procurement_documents(status);
CREATE INDEX idx_procurement_documents_source ON public.procurement_documents(source_id);
CREATE INDEX idx_risk_alerts_document ON public.risk_alerts(document_id);
CREATE INDEX idx_risk_alerts_status ON public.risk_alerts(status);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_text_analysis_cache_document ON public.text_analysis_cache(document_id);

-- 4. FUNCTIONS

-- has_role: Security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- has_any_role: check if user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- handle_new_user: auto-create profile + assign admin to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5. TRIGGERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procurement_documents_updated_at
  BEFORE UPDATE ON public.procurement_documents FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_risk_rules_updated_at
  BEFORE UPDATE ON public.risk_rules FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_risk_alerts_updated_at
  BEFORE UPDATE ON public.risk_alerts FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- data_sources
CREATE POLICY "Authenticated can view data sources"
  ON public.data_sources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/Gestor can manage data sources"
  ON public.data_sources FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[]));

-- procurement_documents
CREATE POLICY "Authenticated can view documents"
  ON public.procurement_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/Gestor can insert documents"
  ON public.procurement_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[]));

CREATE POLICY "Admin/Gestor can update documents"
  ON public.procurement_documents FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[]));

CREATE POLICY "Admin can delete documents"
  ON public.procurement_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- risk_rules
CREATE POLICY "Authenticated can view rules"
  ON public.risk_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can manage rules"
  ON public.risk_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- risk_alerts
CREATE POLICY "Authenticated can view alerts"
  ON public.risk_alerts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authorized users can update alerts"
  ON public.risk_alerts FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor', 'auditor']::public.app_role[]));

CREATE POLICY "Admin/Gestor can insert alerts"
  ON public.risk_alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'gestor']::public.app_role[]));

-- text_analysis_cache
CREATE POLICY "Authenticated can view cache"
  ON public.text_analysis_cache FOR SELECT TO authenticated
  USING (true);

-- audit_logs
CREATE POLICY "Admins can view all logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. SEED: Regras iniciais
INSERT INTO public.risk_rules (name, description, rule_type, category, severity, parameters, is_active) VALUES
('Sobrepreço', 'Detecta valores estimados acima da referência de mercado', 'numeric', 'financeiro', 4, '{"threshold_percent": 20, "comparison": "above_market"}', true),
('Direcionamento de Marca', 'Detecta menções a marcas específicas que podem restringir competição', 'keyword', 'competitividade', 4, '{"keywords": ["marca", "fabricante exclusivo", "modelo específico", "único fornecedor"]}', true),
('Prazo Exíguo', 'Detecta prazos de publicação menores que o mínimo legal', 'numeric', 'temporal', 3, '{"min_days_pregao": 8, "min_days_concorrencia": 30, "min_days_tomada": 15}', true);

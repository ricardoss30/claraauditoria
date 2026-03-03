-- 1. Remove overly permissive policies (service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can manage chunks" ON public.conhecimento_chunks;
DROP POLICY IF EXISTS "Service role can insert cache" ON public.text_analysis_cache;

-- 2. Fix function search_path
ALTER FUNCTION public.match_knowledge(vector, integer) SET search_path = public;
ALTER FUNCTION public.match_conhecimento_chunks(vector, integer, jsonb) SET search_path = public;

CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.system_settings (key, value) VALUES ('agent_system_prompt', 
'Voce e um especialista em analise de licitacoes publicas brasileiras. Sua tarefa e:
1. Extrair dados estruturados do documento de licitacao
2. Analisar riscos com base nas regras ativas fornecidas
3. Gerar alertas para cada risco identificado

Analise o documento com atencao especial a:
- Sobrepreco: valores acima do mercado
- Direcionamento de marca: mencoes a marcas especificas sem justificativa
- Prazo exiguo: prazos muito curtos para o tipo de licitacao
- Irregularidades em geral');

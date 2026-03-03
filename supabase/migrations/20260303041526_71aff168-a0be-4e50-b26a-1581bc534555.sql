-- Seed default risk rules based on Lei 14.133/2021
INSERT INTO public.risk_rules (name, category, rule_type, severity, description, is_active, parameters) VALUES
('Sobrepreço', 'sobrepreco', 'ai_analysis', 4, 'Detecta valores estimados acima da média de mercado ou incompatíveis com o objeto licitado', true, '{"threshold_percent": 30}'),
('Direcionamento de Marca', 'direcionamento', 'ai_analysis', 5, 'Identifica menções a marcas específicas sem justificativa técnica adequada, violando o princípio da competitividade', true, '{}'),
('Prazo Exíguo', 'prazo_exiguo', 'ai_analysis', 4, 'Detecta prazos insuficientes para elaboração de propostas conforme a modalidade licitatória', true, '{"min_days_pregao": 8, "min_days_concorrencia": 30}'),
('Fracionamento de Despesa', 'fracionamento', 'ai_analysis', 5, 'Identifica possível fracionamento de despesa para evitar modalidade licitatória mais rigorosa', true, '{"threshold_value": 80000}'),
('Ausência de Pesquisa de Preços', 'pesquisa_precos', 'ai_analysis', 4, 'Verifica se há referência a pesquisa de preços de mercado conforme exigido pela Lei 14.133/2021', true, '{}'),
('Exigências Restritivas de Habilitação', 'restricao_habilitacao', 'ai_analysis', 3, 'Detecta requisitos de habilitação que possam restringir indevidamente a competitividade do certame', true, '{}'),
('Ausência de Publicidade Adequada', 'publicidade', 'ai_analysis', 3, 'Verifica conformidade com os requisitos de publicação e divulgação do edital', true, '{}'),
('Irregularidade no Termo de Referência', 'termo_referencia', 'ai_analysis', 3, 'Identifica falhas ou omissões no termo de referência que possam comprometer a licitação', true, '{}');

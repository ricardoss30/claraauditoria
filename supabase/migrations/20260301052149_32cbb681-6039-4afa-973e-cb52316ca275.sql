ALTER TABLE conhecimento_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view chunks" ON conhecimento_chunks
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage chunks" ON conhecimento_chunks
  FOR ALL USING (true) WITH CHECK (true);
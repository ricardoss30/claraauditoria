
-- Add INSERT policy for text_analysis_cache for service role usage
CREATE POLICY "Service role can insert cache"
ON public.text_analysis_cache FOR INSERT
WITH CHECK (true);

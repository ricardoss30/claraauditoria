-- Storage RLS policies for base_conhecimento bucket
CREATE POLICY "Authenticated users can upload to base_conhecimento"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'base_conhecimento');

CREATE POLICY "Authenticated users can read from base_conhecimento"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'base_conhecimento');

CREATE POLICY "Authenticated users can delete from base_conhecimento"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'base_conhecimento');

CREATE POLICY "Authenticated users can update base_conhecimento"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'base_conhecimento');
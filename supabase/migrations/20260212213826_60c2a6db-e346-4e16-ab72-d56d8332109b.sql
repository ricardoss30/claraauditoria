-- Create the documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');


## Fix: Create the "documents" Storage Bucket

The upload fails because the Supabase storage bucket `documents` referenced in `useDocumentUpload.ts` does not exist.

### What will be done

1. **Create a SQL migration** to set up the `documents` storage bucket with public access (so processed files can be referenced)
2. **Add RLS policies** on `storage.objects` to allow authenticated users to upload and read files from the bucket

### Technical Details

**Migration SQL:**
```sql
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
```

No changes to application code are needed -- the bucket name `documents` already matches what `useDocumentUpload.ts` expects.


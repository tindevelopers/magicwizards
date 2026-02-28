-- Create Storage Bucket for Support Ticket Attachments
-- Note: This requires the storage extension to be enabled

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-tickets',
  'support-tickets',
  false, -- Private bucket - uses signed URLs for access
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for support-tickets bucket
-- Users can upload files to their tenant's folder
DROP POLICY IF EXISTS "Users can upload support ticket attachments" ON storage.objects;
CREATE POLICY "Users can upload support ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-tickets'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::TEXT 
      FROM users 
      WHERE id = auth.uid()
      AND tenant_id IS NOT NULL
    )
  );

-- Users can view attachments for tickets they can access
DROP POLICY IF EXISTS "Users can view support ticket attachments" ON storage.objects;
CREATE POLICY "Users can view support ticket attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-tickets'
    AND auth.uid() IS NOT NULL
    AND (
      -- Can view if in their tenant's folder
      (storage.foldername(name))[1] IN (
        SELECT tenant_id::TEXT 
        FROM users 
        WHERE id = auth.uid()
        AND tenant_id IS NOT NULL
      )
      OR
      -- Platform admins can view all
      EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name = 'Platform Admin'
        AND u.tenant_id IS NULL
      )
    )
  );

-- Users can delete their own uploaded files
DROP POLICY IF EXISTS "Users can delete support ticket attachments" ON storage.objects;
CREATE POLICY "Users can delete support ticket attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'support-tickets'
    AND auth.uid() IS NOT NULL
    AND (
      -- Can delete if uploaded by them (check via metadata or folder structure)
      (storage.foldername(name))[1] IN (
        SELECT tenant_id::TEXT 
        FROM users 
        WHERE id = auth.uid()
        AND tenant_id IS NOT NULL
      )
      OR
      -- Platform admins can delete all
      EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name = 'Platform Admin'
        AND u.tenant_id IS NULL
      )
    )
  );


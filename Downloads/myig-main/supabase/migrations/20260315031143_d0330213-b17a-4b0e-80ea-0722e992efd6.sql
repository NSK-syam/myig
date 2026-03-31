CREATE POLICY "Allow public uploads to instagram-images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'instagram-images');
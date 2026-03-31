
-- Storage bucket for proxied Instagram images
INSERT INTO storage.buckets (id, name, public) VALUES ('instagram-images', 'instagram-images', true);

-- Allow anyone to read from the bucket
CREATE POLICY "Public read access for instagram images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'instagram-images');

-- Allow edge functions (service role) to upload
CREATE POLICY "Service role upload for instagram images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'instagram-images');

-- Cache table for Instagram extractions
CREATE TABLE public.instagram_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT,
  is_video BOOLEAN DEFAULT false,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public read access (no auth needed)
ALTER TABLE public.instagram_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for instagram extractions"
ON public.instagram_extractions FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role insert for instagram extractions"
ON public.instagram_extractions FOR INSERT
TO service_role
WITH CHECK (true);

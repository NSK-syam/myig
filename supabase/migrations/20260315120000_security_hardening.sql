-- Make screenshot storage private and remove anonymous direct uploads.
UPDATE storage.buckets
SET public = false
WHERE id = 'instagram-images';

DROP POLICY IF EXISTS "Public read access for instagram images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to instagram-images" ON storage.objects;

-- The application no longer needs anonymous reads of cached extractions.
DROP POLICY IF EXISTS "Public read access for instagram extractions" ON public.instagram_extractions;

-- Best-effort per-IP rate limiting for public edge functions.
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT edge_rate_limits_action_subject_window_key UNIQUE (action, subject, window_start)
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

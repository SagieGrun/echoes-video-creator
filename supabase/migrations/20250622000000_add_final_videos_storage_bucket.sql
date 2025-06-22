-- Create storage bucket for final videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'final-videos',
  'final-videos',
  false,
  314572800, -- 300MB limit (large for compiled videos)
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for final-videos bucket
CREATE POLICY "Users can view their own final videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'final-videos' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Service can upload final videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'final-videos'
  );

CREATE POLICY "Service can update final videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'final-videos'
  );

CREATE POLICY "Users can delete their own final videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'final-videos' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  ); 
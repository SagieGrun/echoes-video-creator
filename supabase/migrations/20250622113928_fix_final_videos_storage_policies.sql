-- Fix storage policies for final-videos bucket
-- The issue: policies were checking (storage.foldername(name))[1] but user_id is in position [2]
-- File path structure: final_videos/{user_id}/{request_id}.mp4
-- So foldername returns: [1] = "final_videos", [2] = "{user_id}"

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own final videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own final videos" ON storage.objects;

-- Recreate policies with correct folder indexing
CREATE POLICY "Users can view their own final videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'final-videos' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own final videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'final-videos' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

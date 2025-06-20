-- Add video_file_path column to store permanent video file paths
ALTER TABLE public.clips ADD COLUMN video_file_path TEXT;

-- Add comment to clarify the difference between video_url and video_file_path
COMMENT ON COLUMN public.clips.video_url IS 'Signed URL for video access (temporary)';
COMMENT ON COLUMN public.clips.video_file_path IS 'Permanent file path in storage bucket'; 
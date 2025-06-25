-- Make final-videos bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'final-videos';

-- Add public_url column to final_videos table
ALTER TABLE public.final_videos ADD COLUMN IF NOT EXISTS public_url TEXT;

-- Add comment to clarify the difference between file_path and public_url
COMMENT ON COLUMN public.final_videos.file_path IS 'Internal file path in storage bucket';
COMMENT ON COLUMN public.final_videos.public_url IS 'Public URL for sharing and access';

-- Update existing records to generate public URLs from file_path
-- This will be handled in the application code for existing records 
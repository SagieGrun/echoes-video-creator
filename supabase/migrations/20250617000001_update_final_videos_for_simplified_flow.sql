-- Update final_videos table to allow NULL project_id for simplified user flow
ALTER TABLE public.final_videos 
ALTER COLUMN project_id DROP NOT NULL;

-- Add index for user-based queries without project_id
CREATE INDEX idx_final_videos_user_null_project ON public.final_videos(user_id) 
WHERE project_id IS NULL;

-- Update RLS policy to handle both project-based and user-based access
DROP POLICY IF EXISTS "Users can manage their own final videos" ON public.final_videos;

CREATE POLICY "Users can manage their own final videos"
ON public.final_videos
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 
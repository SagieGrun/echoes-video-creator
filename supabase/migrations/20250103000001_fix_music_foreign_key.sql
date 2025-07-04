-- Fix Foreign Key Constraint for Music Tracks
-- This migration fixes the foreign key constraint between final_videos and music_tracks
-- to allow music track deletion by setting music_track_id to NULL when referenced music is deleted

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.final_videos 
DROP CONSTRAINT IF EXISTS final_videos_music_track_id_fkey;

-- Step 2: Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.final_videos 
ADD CONSTRAINT final_videos_music_track_id_fkey 
FOREIGN KEY (music_track_id) 
REFERENCES public.music_tracks(id) 
ON DELETE SET NULL;

-- Step 3: Add a comment explaining the behavior
COMMENT ON CONSTRAINT final_videos_music_track_id_fkey ON public.final_videos
IS 'Foreign key to music_tracks with ON DELETE SET NULL - when a music track is deleted, the music_track_id in final_videos is set to NULL rather than preventing deletion';

-- Step 4: Create an index on music_track_id for better performance
CREATE INDEX IF NOT EXISTS idx_final_videos_music_track_id 
ON public.final_videos(music_track_id) 
WHERE music_track_id IS NOT NULL; 
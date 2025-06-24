-- Add error_message column to final_videos table for better error handling
ALTER TABLE public.final_videos 
ADD COLUMN error_message TEXT; 
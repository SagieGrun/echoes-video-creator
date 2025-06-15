-- Add generation_job_id to clips table for tracking AI generation jobs
ALTER TABLE public.clips ADD COLUMN generation_job_id TEXT;

-- Create index for faster lookups by generation job ID
CREATE INDEX IF NOT EXISTS idx_clips_generation_job_id 
ON public.clips(generation_job_id);

-- Update the clips table to match the new structure in types
-- The clips table already has the fields we need, just adding the generation_job_id 
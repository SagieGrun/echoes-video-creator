-- Add regen_count column to clips table
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS regen_count INTEGER NOT NULL DEFAULT 0;

-- Create index for faster lookups by regen_count
CREATE INDEX IF NOT EXISTS idx_clips_regen_count 
ON public.clips(regen_count); 
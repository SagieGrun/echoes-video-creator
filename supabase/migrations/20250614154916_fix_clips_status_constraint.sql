-- Fix clips status check constraint to match application code
-- The original constraint only allowed: 'generating', 'ready', 'error'
-- But the application uses: 'pending', 'processing', 'completed', 'failed'

-- Drop the existing check constraint
ALTER TABLE public.clips DROP CONSTRAINT IF EXISTS clips_status_check;

-- Add the new check constraint with correct status values
ALTER TABLE public.clips ADD CONSTRAINT clips_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Update the default value to match the application logic
ALTER TABLE public.clips ALTER COLUMN status SET DEFAULT 'pending';

-- Update any existing records with old status values to new ones
UPDATE public.clips 
SET status = CASE 
  WHEN status = 'generating' THEN 'processing'
  WHEN status = 'ready' THEN 'completed'
  WHEN status = 'error' THEN 'failed'
  ELSE status
END
WHERE status IN ('generating', 'ready', 'error');

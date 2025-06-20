-- Clean up failed implementation
DROP TABLE IF EXISTS public.generated_videos;

-- Create clean final_videos table for AWS Lambda workflow
CREATE TABLE public.final_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Finalization settings
  selected_clips JSONB NOT NULL, -- Array of {clip_id, order} objects
  music_track_id UUID REFERENCES public.music_tracks(id),
  transition_type VARCHAR(20) DEFAULT 'fade',
  music_volume FLOAT DEFAULT 0.7,
  
  -- Compilation status
  status VARCHAR(20) DEFAULT 'draft', -- draft, processing, completed, failed
  
  -- Final video details
  file_url TEXT,
  file_path TEXT,
  total_duration INTEGER, -- in seconds
  file_size BIGINT, -- in bytes
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  compilation_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_transition CHECK (transition_type IN ('fade', 'cut', 'dissolve', 'slide')),
  CONSTRAINT valid_volume CHECK (music_volume >= 0 AND music_volume <= 1)
);

-- Create indexes for performance
CREATE INDEX idx_final_videos_project_id ON public.final_videos(project_id);
CREATE INDEX idx_final_videos_user_id ON public.final_videos(user_id);
CREATE INDEX idx_final_videos_status ON public.final_videos(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.final_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own final videos
CREATE POLICY "Users can manage their own final videos"
ON public.final_videos
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 
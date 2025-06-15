-- Create admin_config table for storing admin configuration
CREATE TABLE IF NOT EXISTS public.admin_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (no user restrictions for admin config)
CREATE POLICY "admin_config_access" ON public.admin_config FOR ALL USING (true);

-- Create function to create admin_config table (for API compatibility)
CREATE OR REPLACE FUNCTION create_admin_config_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function exists for API compatibility
  -- The table is already created by migration
  RETURN;
END;
$$;

-- Insert default configurations
INSERT INTO public.admin_config (key, value) VALUES 
  ('system_prompt', '{"prompt": "You are an AI assistant that helps create cinematic, emotional video clips from static photos. \\n\\nWhen generating video clips:\\n- Focus on subtle, natural movements that bring the photo to life\\n- Add gentle camera movements like slow pans or zooms\\n- Create atmospheric effects like light changes or environmental movement\\n- Maintain the emotional tone and story of the original photo\\n- Keep movements realistic and not overly dramatic\\n- Ensure the clip feels cinematic and professional\\n\\nThe goal is to transform static memories into living, breathing moments that evoke emotion and nostalgia."}'),
  ('model_config', '{"activeProvider": "runway", "providers": {"runway": {"name": "Runway ML", "status": "active", "config": {"model": "gen3", "resolution": "1280x768", "duration": 5}}}}'),
  ('credit_packs', '{"packs": [{"id": "1", "name": "Starter Pack", "credits": 5, "price_cents": 1500, "is_active": true, "created_at": "2024-12-09T00:00:00.000Z"}, {"id": "2", "name": "Standard Pack", "credits": 20, "price_cents": 4500, "is_active": true, "created_at": "2024-12-09T00:00:00.000Z"}, {"id": "3", "name": "Premium Pack", "credits": 40, "price_cents": 8000, "is_active": true, "created_at": "2024-12-09T00:00:00.000Z"}]}')
ON CONFLICT (key) DO NOTHING; 
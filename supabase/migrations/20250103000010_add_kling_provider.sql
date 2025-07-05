-- Add Kling V2 provider to model configuration
-- Update the existing model_config to include Kling provider

UPDATE public.admin_config 
SET value = jsonb_set(
  value, 
  '{providers,kling}', 
  '{
    "name": "Kling V2", 
    "status": "active", 
    "config": {
      "model": "klingai/v2-master-image-to-video",
      "defaultPrompt": "A cinematic moment that brings this image to life with subtle, realistic motion",
      "duration": 5
    }
  }'::jsonb
) 
WHERE key = 'model_config';

-- If the model_config doesn't exist, create it with both providers
INSERT INTO public.admin_config (key, value) 
SELECT 'model_config', '{
  "activeProvider": "runway",
  "providers": {
    "runway": {
      "name": "Runway ML",
      "status": "active",
      "config": {
        "model": "gen-3a-turbo",
        "defaultPrompt": "A cinematic moment that brings this image to life with subtle, realistic motion"
      }
    },
    "kling": {
      "name": "Kling V2",
      "status": "active",
      "config": {
        "model": "klingai/v2-master-image-to-video",
        "defaultPrompt": "A cinematic moment that brings this image to life with subtle, realistic motion",
        "duration": 5
      }
    }
  }
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.admin_config WHERE key = 'model_config'); 
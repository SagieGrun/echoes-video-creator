-- Add output aspect ratio column to final_videos table
ALTER TABLE final_videos ADD COLUMN output_aspect_ratio VARCHAR(10) DEFAULT '16:9';

-- Add index for filtering by aspect ratio
CREATE INDEX idx_final_videos_aspect_ratio ON final_videos(output_aspect_ratio);

-- Add comment for documentation
COMMENT ON COLUMN final_videos.output_aspect_ratio IS 'Output aspect ratio of the final video (16:9, 9:16, 1:1)'; 
-- Enable RLS on the music_tracks table
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Grant full access to music_tracks for any authenticated user
CREATE POLICY "Allow full access for authenticated users"
ON public.music_tracks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant full access to music-tracks storage for any authenticated user
CREATE POLICY "Allow authenticated access to music-tracks"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'music-tracks' )
WITH CHECK ( bucket_id = 'music-tracks' );

-- This policy allows public, read-only access to all files in the 'music-tracks' bucket.
-- This is required for the audio player on the admin page to be able to stream the music.
CREATE POLICY "Public read access for music-tracks"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'music-tracks' ); 
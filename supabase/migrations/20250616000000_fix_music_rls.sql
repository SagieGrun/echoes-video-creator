-- Drop old policies on music_tracks table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow full access for admins" ON public.music_tracks;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.music_tracks;

-- Disable RLS on the music_tracks table. Access is controlled by the API route.
ALTER TABLE public.music_tracks DISABLE ROW LEVEL SECURITY;

-- Drop old policies on the music-tracks storage bucket.
DROP POLICY IF EXISTS "Allow public read on music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin management of music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access to music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for music-tracks" ON storage.objects;

-- Create a single, correct policy for public read access to the music files.
CREATE POLICY "Allow public read on music-tracks"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'music-tracks' ); 
-- Fix Music Tracks RLS Security
-- This migration addresses the Supabase security warnings:
-- 1. "Policy Exists RLS Disabled" 
-- 2. "RLS Disabled in Public"

-- Step 1: Clean up any orphaned policies from previous migrations
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.music_tracks;
DROP POLICY IF EXISTS "Allow full access for admins" ON public.music_tracks;
DROP POLICY IF EXISTS "Authenticated users can manage music tracks" ON public.music_tracks;

-- Step 2: Enable RLS on music_tracks table
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies

-- Allow authenticated users to read music tracks (needed for finalization)
CREATE POLICY "Authenticated users can read music tracks"
ON public.music_tracks FOR SELECT
TO authenticated
USING (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role can manage music tracks"
ON public.music_tracks FOR ALL
TO service_role
USING (true);

-- Note: Admin API uses service role key which bypasses RLS automatically
-- The service role policy above is for completeness and future compatibility

-- Step 4: Add documentation comments
COMMENT ON POLICY "Authenticated users can read music tracks" ON public.music_tracks
IS 'Allows authenticated users to read music tracks for video finalization. Admin operations use service role which bypasses RLS.';

COMMENT ON TABLE public.music_tracks
IS 'Music tracks for background audio in videos. RLS enabled with read access for authenticated users and full admin access via service role.'; 
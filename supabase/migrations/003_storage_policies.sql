-- ============================================================================
-- RESTAURANT MANAGEMENT & POS SYSTEM - STORAGE BUCKET & PERMISSIONS
-- Migration: 003_storage_policies.sql
-- Description: Creates the public 'menu-images' storage bucket, sets up
--              read/write policies, and grants table permissions to anon/authenticated.
-- ============================================================================

-- 1. Grant Schema & Table Permissions to API Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Create or update 'menu-images' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'menu-images',
    'menu-images',
    true,
    1048576, -- 1MB limit (client-side compression ensures < 100KB)
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- 3. Storage Row Level Security Policies
DO $$ BEGIN
    CREATE POLICY "Allow public read access to menu images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'menu-images');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow upload to menu images bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'menu-images');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow update to menu images bucket"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'menu-images')
    WITH CHECK (bucket_id = 'menu-images');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow delete from menu images bucket"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'menu-images');
EXCEPTION WHEN duplicate_object THEN null; END $$;

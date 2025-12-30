-- Add RLS policies for popups and settings tables
-- This migration fixes the issue where admins cannot create popups/modify settings due to RLS blocking

-- First, drop any existing policies to start fresh
DROP POLICY IF EXISTS "Allow INSERT for admins and superadmins" ON popups;
DROP POLICY IF EXISTS "Allow SELECT for authenticated users" ON popups;
DROP POLICY IF EXISTS "Allow UPDATE for admins and superadmins" ON popups;
DROP POLICY IF EXISTS "Allow DELETE for admins and superadmins" ON popups;

DROP POLICY IF EXISTS "Allow INSERT for admins and superadmins" ON settings;
DROP POLICY IF EXISTS "Allow SELECT for authenticated users" ON settings;
DROP POLICY IF EXISTS "Allow UPDATE for admins and superadmins" ON settings;
DROP POLICY IF EXISTS "Allow DELETE for admins and superadmins" ON settings;

-- Add missing columns to popups table
-- Using snake_case for PostgreSQL convention
ALTER TABLE popups ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS button_text TEXT;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS button_url TEXT;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS show_deadline BOOLEAN DEFAULT false;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS show_button BOOLEAN DEFAULT false;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS on both tables (if not already enabled)
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POPUPS TABLE POLICIES
-- ============================================

-- Allow admins and superadmins to INSERT new popups
CREATE POLICY "Allow INSERT for admins and superadmins"
ON popups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

-- Allow all authenticated users to SELECT/view popups
CREATE POLICY "Allow SELECT for authenticated users"
ON popups
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and superadmins to UPDATE popups
CREATE POLICY "Allow UPDATE for admins and superadmins"
ON popups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

-- Allow admins and superadmins to DELETE popups
CREATE POLICY "Allow DELETE for admins and superadmins"
ON popups
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

-- ============================================
-- SETTINGS TABLE POLICIES
-- ============================================

-- Allow admins and superadmins to INSERT new settings
CREATE POLICY "Allow INSERT for admins and superadmins"
ON settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

-- Allow all authenticated users to SELECT/view settings
CREATE POLICY "Allow SELECT for authenticated users"
ON settings
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and superadmins to UPDATE settings
CREATE POLICY "Allow UPDATE for admins and superadmins"
ON settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

-- Allow admins and superadmins to DELETE settings
CREATE POLICY "Allow DELETE for admins and superadmins"
ON settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

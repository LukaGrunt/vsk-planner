-- Fix RLS policies for posts table to allow admin/superadmin to create events
-- This migration fixes the issue where admins cannot create events due to RLS blocking

-- First, drop any existing policies to start fresh
DROP POLICY IF EXISTS "Allow INSERT for admins and superadmins" ON posts;
DROP POLICY IF EXISTS "Allow SELECT for authenticated users" ON posts;
DROP POLICY IF EXISTS "Allow UPDATE for admins and superadmins" ON posts;
DROP POLICY IF EXISTS "Allow DELETE for admins and superadmins" ON posts;

-- Enable RLS on posts table (if not already enabled)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Keep RLS disabled on members table (causes issues with role lookup)
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- POSTS TABLE POLICIES
-- ============================================

-- Allow admins and superadmins to INSERT new posts/events
CREATE POLICY "Allow INSERT for admins and superadmins"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.role IN ('admin', 'superadmin')
  )
);

-- Allow all authenticated users to SELECT/view posts
CREATE POLICY "Allow SELECT for authenticated users"
ON posts
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and superadmins to UPDATE posts
CREATE POLICY "Allow UPDATE for admins and superadmins"
ON posts
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

-- Allow admins and superadmins to DELETE posts
CREATE POLICY "Allow DELETE for admins and superadmins"
ON posts
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
-- MEMBERS TABLE - RLS DISABLED
-- ============================================
-- RLS is disabled on members table to avoid issues with role lookup
-- The app needs to read member roles on login, and RLS policies
-- would create circular dependencies (need to check role to read role)
-- Security is enforced at the posts table level instead

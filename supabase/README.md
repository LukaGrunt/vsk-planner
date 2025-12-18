# Supabase Migrations

This directory contains SQL migration files for the VSK Planner Supabase database.

## How to Apply Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of the migration file from `migrations/20251217000001_fix_rls_policies.sql`
6. Click **Run** to execute the SQL
7. Verify the policies were created by going to **Authentication** → **Policies** → Select the `posts` table

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## Current Migrations

### 20251217000001_fix_rls_policies.sql
**Purpose:** Fix RLS policies to allow admins to create events

**Problem Fixed:** Users with admin/superadmin roles were getting "new row violates row-level security policy" errors when trying to create events.

**Changes:**
- Enables RLS on `posts` and `members` tables
- Adds INSERT/UPDATE/DELETE policies for admins/superadmins on `posts` table
- Adds SELECT policy for all authenticated users on `posts` table
- Adds SELECT policy for users to view their own member record (needed for role lookup)
- Adds policies for admins to manage member records

### 20251218000001_add_popups_settings_rls.sql
**Purpose:** Add RLS policies for popups and settings tables

**Problem Fixed:** Superadmins cannot create popups or modify settings due to missing RLS policies on these tables.

**Changes:**
- Enables RLS on `popups` and `settings` tables
- Adds INSERT/UPDATE/DELETE policies for admins/superadmins on both tables
- Adds SELECT policy for all authenticated users on both tables

## Verifying Policies

After applying the migration, verify the policies are working:

1. **Login as an admin user**
2. **Try to create an event** - should work without errors
3. **Login as a regular user** - should be able to view events but not create/edit/delete them

## Troubleshooting

### Still getting RLS errors after applying migration?

1. **Check the policies are active:** Go to Supabase Dashboard → Authentication → Policies → Select `posts` table
2. **Verify your user has admin role:** Run this query in SQL Editor:
   ```sql
   SELECT * FROM members WHERE user_id = auth.uid();
   ```
   The `role` field should be `admin` or `superadmin`

3. **Check if the member record exists:** If the query above returns no rows, your user doesn't have a member record. You need to create one:
   ```sql
   INSERT INTO members (user_id, email, role)
   VALUES (
     'YOUR_USER_ID',  -- Get this from auth.users table
     'YOUR_EMAIL',
     'admin'
   );
   ```

### How to check your user ID

Run this in SQL Editor:
```sql
SELECT id, email FROM auth.users;
```

Find your email and copy the corresponding `id`.

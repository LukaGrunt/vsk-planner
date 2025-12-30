# Push Notifications Setup Guide

## What's Been Completed

### ✅ Step 1: Infrastructure Setup
- **web-push package installed** (for VAPID key generation)
- **VAPID keys generated** (authentication for push notifications)
- **Database migration created**: `push_subscriptions` table with RLS policies
- **Service worker updated**: Can now receive and display push notifications
- **.env.example created**: Template for environment variables

### Generated VAPID Keys
```
Public Key: BA_2wu_tNgy03s6ckOKI4MrwnePuEnYC20foGMPb0auqTu7Gd18-xbtDwHVGZ3wVjbDBP0lOgfzMv2lV1ouZ_Pg

Private Key: uCqW-NEUVrwSKQsPw04Ka6nNnE53aeoUvlN0zMvpaSo
```

⚠️ **IMPORTANT**: Keep the private key secret! Only use it server-side.

---

## What's Still Needed

### 🔄 Step 2: Database Setup (5 minutes)

Run the migration in Supabase SQL Editor:

```sql
-- Copy contents from:
supabase/migrations/20251218000003_create_push_subscriptions.sql
```

This creates the `push_subscriptions` table to store user notification subscriptions.

### 🔄 Step 3: Environment Variables (2 minutes)

Create a `.env` file (or add to existing one):

```env
# Existing Supabase vars
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add these new VAPID keys
VITE_VAPID_PUBLIC_KEY=BA_2wu_tNgy03s6ckOKI4MrwnePuEnYC20foGMPb0auqTu7Gd18-xbtDwHVGZ3wVjbDBP0lOgfzMv2lV1ouZ_Pg
```

**For Vercel deployment**, add the same environment variable in your Vercel project settings.

### 🔄 Step 4: Add Frontend Subscription Logic (30 minutes)

Need to add to `src/App.jsx`:

1. **Request notification permission** on login
2. **Subscribe user** to push notifications
3. **Save subscription** to database
4. **Unsubscribe** on logout
5. **Settings toggle** to enable/disable notifications

### 🔄 Step 5: Create Supabase Edge Function (1 hour)

Create a Supabase Edge Function to send notifications:

**File**: `supabase/functions/send-push/index.ts`

This function will:
- Accept notification data (title, body, user IDs)
- Fetch push subscriptions from database
- Send push notifications using web-push library
- Handle errors and retries

**Requirements**:
- Supabase CLI installed
- Edge function deployed to Supabase

### 🔄 Step 6: Add Notification Triggers (30 minutes)

Add triggers in `src/App.jsx` to send notifications for:

**High Priority:**
- New event created → Notify all members
- Event cancelled → Notify RSVPed members
- @mention in chat → Notify mentioned user

**Medium Priority:**
- RSVP deadline approaching → Notify members
- Training marked complete → Notify participants

**Low Priority:**
- New member joined
- Role changed

---

## Implementation Options

### Option A: Complete Implementation (Recommended)

**Time:** 2-3 hours
**Complexity:** Medium
**Benefits:** Full push notification system

**Steps:**
1. Run database migration (5 min)
2. Add environment variables (2 min)
3. Add frontend subscription logic (30 min)
4. Create Edge Function (1 hour)
5. Add notification triggers (30 min)
6. Test (30 min)

### Option B: Defer for Now

**Keep what we have:**
- Database migration file ready
- Service worker ready
- VAPID keys generated

**Come back later when:**
- You have time to complete setup
- You've tested core features with users first
- Push notifications become a requested feature

### Option C: Use OneSignal Instead (Easier)

**Time:** 30 minutes
**Complexity:** Low
**Benefits:** No backend coding, easier setup

**Trade-off:** External dependency, less control

---

## Current State

### What Works Now
✅ Service worker can receive and display push notifications
✅ Database schema ready
✅ VAPID keys generated

### What Doesn't Work Yet
❌ Users can't subscribe to notifications
❌ No Edge Function to send notifications
❌ No triggers for events

---

## Testing Push Notifications (Once Complete)

### Manual Test
1. Open Chrome DevTools → Application → Service Workers
2. Click "Push" to send a test notification
3. Should see notification appear

### Integration Test
1. Create new event as admin
2. All members should receive push notification
3. Click notification → opens app to event page

---

## Troubleshooting

### "Push notification permission blocked"
- User must manually enable in browser settings
- On iOS: Settings → Safari → vsk-planner.vercel.app → Notifications

### "Subscription failed"
- Check VAPID public key is correct
- Check service worker is registered
- Check browser supports push notifications

### "No notifications received"
- Check Edge Function is deployed
- Check subscriptions are saved in database
- Check browser console for errors

---

## Next Steps

**Option 1 - Complete Now:**
I can continue implementing steps 4-6 (subscription logic, Edge Function, triggers).

**Option 2 - Defer:**
Everything is ready to pick up later. Just need to:
1. Run migration
2. Add env vars
3. Continue from Step 4

**What do you want to do?**
- Continue implementing now? (2-3 hours)
- Stop here and defer? (can finish later)
- Switch to OneSignal? (simpler alternative)

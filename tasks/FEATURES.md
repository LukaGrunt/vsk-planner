# VSK Planner - Complete Features & Capabilities Documentation

**Last Updated:** December 18, 2024
**Version:** 1.0 (Supabase Migration Complete)

---

## Table of Contents
1. [Authentication & User Management](#authentication--user-management)
2. [Event Management System](#event-management-system)
3. [Calendar & Timeline](#calendar--timeline)
4. [RSVP System](#rsvp-system)
5. [Real-Time Chat](#real-time-chat)
6. [Admin Dashboard](#admin-dashboard)
7. [Training Match Tracker](#training-match-tracker)
8. [Notifications & Popups](#notifications--popups)
9. [Featured Articles](#featured-articles)
10. [User Profiles](#user-profiles)
11. [PWA Features](#pwa-features)
12. [Technical Capabilities](#technical-capabilities)

---

## Authentication & User Management

### Login/Logout
- **Email/password authentication** via Supabase Auth
- **"Remember me" functionality** - stores email in localStorage
- **Session persistence** - automatic re-login on app reopen
- **Password reset** via email (Supabase Auth)
- **Auto-logout** on session expiration

### User Roles (3-tier system)
1. **User** (default)
   - View events and calendar
   - RSVP to training/competitions
   - Send/receive chat messages
   - Edit own profile
   - View featured articles

2. **Admin**
   - All user permissions
   - Create/edit/delete events
   - Mark trainings as complete
   - Cancel events
   - View member statistics
   - Access admin dashboard

3. **Superadmin**
   - All admin permissions
   - Create new members
   - Change user roles
   - Toggle membership payment status
   - Full member management
   - Manage popups and featured articles

### First-Time User Experience
- **Automatic member record creation** on first login
- **Role assignment** (default: user)
- **Login timestamp tracking** (first_login_at, last_login_at)

---

## Event Management System

### Event Types (4 types with color coding)
1. **Training** (Red #c1372a)
   - Practice sessions
   - RSVP with weapon license selection
   - Capacity limits
   - Trainer assignment
   - Completion tracking

2. **Competition** (Orange #f59e0b)
   - Official competitions
   - RSVP system
   - Result tracking
   - Attendance logging

3. **Announcement** (Blue #3b82f6)
   - Club announcements
   - General information
   - No RSVP needed

4. **Payment Notice** (Green #10b981)
   - Membership payment reminders
   - Fee notifications

### Event Creation (Admin/Superadmin only)
**Required Fields:**
- Title
- Description
- Event type

**Optional Fields:**
- Date (with toggle to show/hide)
- Time (with toggle to show/hide)
- Location (with toggle to show/hide)
- Max participants (for RSVP events)
- Trainer name
- Link/attachment

**Special Options:**
- **Important marker** (⚠️ badge)
- **Members-only** (hidden from public)
- **Show in news feed** toggle
- **Featured event** toggle

### Event Editing
- **Edit existing events** (title, description, details)
- **Cancel events** with notification system
- **Mark as completed** with notes and attendance tracking
- **Delete events** (with confirmation)

### Event Display
- **Card-based layout** with gradient backgrounds
- **Type-based color coding**
- **Date/time formatting** (DD.MM.YYYY format)
- **Participant count** display
- **"FULL" indicator** when capacity reached
- **Trainer badge** display
- **Important event indicator**

---

## Calendar & Timeline

### Enhanced Calendar View
**Features:**
- Monthly calendar grid
- **Color-coded event markers**:
  - Single event: solid color background
  - Multiple events: **diagonal gradient** showing all event types
- Day selection with event details
- Month navigation (previous/next)
- Today highlighting

**Visual Features:**
- **Smart legend** showing which colors represent which event types
- **Gradient visualization** for days with multiple events
- **Event count badges** on dates
- Responsive mobile design

### Timeline View
- **Upcoming events list**
- Chronological ordering
- Quick event preview
- One-tap access to event details

---

## RSVP System

### User RSVP
**Features:**
- Sign up for training/competition events
- **Weapon license selection** from user profile
- Capacity enforcement (FULL indicator)
- View participant list
- Cancel own registration

**Participant Information Displayed:**
- Name
- Weapon license type and number
- RSVP timestamp

### Admin RSVP Management
- View all participants
- See weapon licenses for safety compliance
- Track attendance
- Mark trainings as complete with participant notes

### Notifications
- RSVP confirmation
- Event cancellation alerts
- Capacity warnings

---

## Real-Time Chat

### Messaging Features
- **WhatsApp-style interface**
- Real-time message updates (Supabase Realtime)
- **@mention autocomplete** - tag specific members
- **Color-coded user avatars** (30 distinct colors, consistent per user)
- Message timestamps
- Author name display
- **Auto-delete after 7 days** (automatic cleanup)

### Chat Functionality
- Send text messages
- Delete own messages
- Scroll to latest messages
- Mention notifications (visual highlighting)
- Message input with @ autocomplete dropdown

### Member Display
- Name-based color avatars
- Role badges (if applicable)
- Online/offline status (future feature)

---

## Admin Dashboard

### Statistics View
**Metrics Displayed:**
- Total member count
- Paid memberships count
- Recent member activity
- Event statistics

### Member Management (Superadmin only)
**Features:**
- View all members
- **Change user roles** (user → admin → superadmin)
- **Toggle membership payment status**
- View member details (name, email, phone, MORS number, weapon licenses)
- **Create new members** via Edge Function
- Search/filter members

### Event Management
- Create new events
- View/edit existing events
- Delete events
- Event type filtering
- Quick access to event details

### Content Management
- Manage featured articles
- Create/edit/delete popups
- Promotional content control

---

## Training Match Tracker

### Match Recording (Admin feature)
**Capabilities:**
- Record match details
- Multiple runs per match
- Multiple stages per run
- Shooter management
- Score tracking
- Time recording

### Data Export
- **CSV export** of match results
- **Screenshot/image export** using html2canvas
- Downloadable match reports

### Match Display
- Table view of results
- Sorting by score/time
- Stage breakdown
- Shooter performance tracking

---

## Notifications & Popups

### Popup Notifications ✅ FIXED
**Features:**
- **Create custom popups** (Superadmin)
- Title and description
- **Optional deadline** with date picker
- **Optional action button** with custom text and URL
- **Active/Inactive toggle** - control visibility
- Dismissible by users
- One-time display per user (localStorage tracking)

**Display Options:**
- Show/hide deadline
- Show/hide button
- Custom button text and URL
- Active status toggle

### Toast Notifications
- Success messages (green)
- Error messages (red)
- Info messages (blue)
- Auto-dismiss after 3 seconds
- Positioned at bottom of screen

### Event Cancellation Alerts
- Modal popup for cancelled events
- Trainer notification information
- Acknowledgement required

---

## Featured Articles

### Article Management (Admin/Superadmin)
**Features:**
- Set featured article in admin dashboard
- Title, description, content
- Optional button with custom text and link
- Yellow/gold branding for promotion

### Display
- Prominent display in news feed
- Card-based layout with gradient background
- Call-to-action button
- Link opening in new tab

---

## User Profiles

### Profile Information
**Fields:**
- First name (Ime)
- Last name (Priimek)
- Email (read-only)
- Phone number (Telefon)
- MORS number (ID code)
- Role display (badge)

### Weapon Licenses
**Management:**
- Add multiple licenses
- License type (Vrsta)
- License number (Število)
- Edit/delete licenses
- Used in RSVP system for safety compliance

### Profile Actions
- Edit profile information
- Update weapon licenses
- Change password
- View role and membership status

---

## PWA Features

### Progressive Web App
- **Installable** on iOS and Android
- **Standalone mode** (full-screen, no browser UI)
- **App icons** (192px and 512px)
- **Service worker** for offline support
- **Manifest.json** configuration

### Offline Support
- Service worker caches static assets
- Offline page display
- Automatic reconnection
- Online/offline status detection

### Mobile Optimization
- Touch-friendly interface
- Mobile-first responsive design
- Bottom navigation bar (mobile UX pattern)
- Swipe gestures (future)

---

## Technical Capabilities

### Database (Supabase PostgreSQL)
**Tables:**
1. **posts** - Events and announcements (RLS enabled)
2. **members** - User profiles (RLS disabled for role lookup)
3. **messages** - Chat messages
4. **popups** - Notification popups (RLS enabled)
5. **settings** - Featured article settings (RLS enabled)

### Real-Time Features
- **Supabase Realtime subscriptions** for chat
- Live message updates
- Auto-refresh on visibility change
- Background sync

### Security
- **Row-Level Security (RLS)** on posts, popups, settings
- Role-based permission checks
- Admin/superadmin verification via database
- Secure password handling (Supabase Auth)
- Server-side member creation (Edge Function)

### Performance
- **Retry logic** for failed requests (withRetry function)
- Loading states and skeletons
- Optimistic updates
- Debounced search/filter

### Error Handling
- **Sentry integration** for production error tracking
- Error boundaries
- User-friendly error messages
- Toast notifications for feedback
- Offline detection

### Localization
- **Slovenian language** (primary)
- **English language** support
- Language toggle in settings
- Translated UI strings

### Data Management
- **Export all data** to JSON (backup feature)
- CSV export for training matches
- Image export for results
- Data import (future)

---

## Current Limitations & Known Issues

### Limitations
1. **Single-file architecture** - entire app in one 5,705-line App.jsx file
2. **No state management library** - using useState/useEffect only
3. **No automated tests** - manual testing only
4. **No CI/CD pipeline** - manual Vercel deployments
5. **Limited file upload** - no image/document attachments yet
6. **No push notifications** - skeleton exists but not implemented
7. **No data analytics** - no usage tracking or metrics

### Recently Fixed Issues ✅
- ✅ Popup creation (missing columns and RLS policies)
- ✅ Event creation RLS policy issue
- ✅ Role detection after login
- ✅ Admin role reset bug
- ✅ Firebase to Supabase migration complete

---

## Future Enhancement Ideas

### High Priority
1. **Image uploads** for events and profiles
2. **Push notifications** for event reminders and chat mentions
3. **Search functionality** across events, members, messages
4. **Event attachments** (PDFs, documents)
5. **Member photo gallery** from competitions
6. **Event results publishing** with photos

### Medium Priority
1. **Email notifications** for event updates
2. **Calendar export** (iCal/Google Calendar)
3. **Advanced statistics** dashboard
4. **Member attendance tracking** over time
5. **Competition results leaderboard**
6. **Training schedule templates**

### Nice to Have
1. **Dark/light theme toggle**
2. **Custom event types**
3. **Recurring events** support
4. **Member check-in** system with QR codes
5. **Equipment inventory** management
6. **Club document repository**
7. **Member voting/polls** system
8. **Multi-club support**

---

## Architecture Notes

### Technology Stack
- **Frontend:** React 18.2.0
- **Build Tool:** Vite 5.0
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Hosting:** Vercel
- **Error Tracking:** Sentry
- **Icons:** lucide-react
- **Styling:** Inline CSS (no separate CSS files)

### Design System
- **Color Palette:**
  - Background: #0a0b0c (near black)
  - Cards: #1c1f22 (dark gray)
  - Primary: #c1372a (VSK red)
  - Borders: #2b2d31

- **Typography:**
  - System fonts (Apple, Segoe UI, Roboto)
  - Sizes: 11px-32px
  - Weights: 400, 600, 700

### Code Organization
- **Monolithic structure** - all code in src/App.jsx
- **Component definitions** inline
- **No separate component files**
- **Hooks-based state management**

---

## Deployment Information

### Production URL
- https://vsk-planner.vercel.app/

### Deployment Process
1. Push to GitHub main branch
2. Vercel auto-deploys
3. Build time: ~1-2 minutes
4. Hard refresh needed for cache clear

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

---

## Support & Maintenance

### Migration History
- **December 17, 2024:** Migrated from Firebase to Supabase
- **December 18, 2024:** Fixed popup creation and RLS policies

### Database Migrations
Location: `supabase/migrations/`
- `20251217000001_fix_rls_policies.sql` - Posts RLS policies
- `20251218000001_add_popups_settings_rls.sql` - Popups/settings RLS + columns
- `20251218000002_fix_popups_nullable_columns.sql` - Remove NOT NULL constraints

### Backup & Recovery
- **Manual JSON export** via admin dashboard
- **Supabase automatic backups** (check Supabase dashboard)
- **Git version control** for code
- No automated backup system currently

---

## Summary Statistics

- **Total Features:** 50+ distinct capabilities
- **Lines of Code:** ~5,705 (App.jsx)
- **Database Tables:** 5
- **User Roles:** 3
- **Event Types:** 4
- **Supported Languages:** 2
- **Screen Views:** 8 main views
- **API Integrations:** Supabase (Auth, Database, Realtime)

---

**This is a fully-functional, production-ready club management system specifically designed for shooting sports clubs.**

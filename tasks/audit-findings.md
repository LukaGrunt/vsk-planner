# Code Audit Findings - VSK Planner

**Date**: 2025-12-20
**Auditor**: Claude Sonnet 4.5
**Scope**: Full codebase audit focusing on authentication, data consistency, and functionality bugs

---

## Executive Summary

Comprehensive audit of the VSK Planner codebase revealed **3 critical bugs** and **2 potential issues** that could affect user experience, particularly around RSVP functionality and data consistency.

### Critical Severity Issues: 3
### Medium Severity Issues: 2
### Total Issues Found: 5

---

## Critical Bugs

### 1. ⚠️ CRITICAL: Max Participants Check Failure in RSVP
**Location**: `src/App.jsx:3126`
**Severity**: CRITICAL
**Impact**: Users can RSVP to full events, exceeding max capacity

**Problem**:
```javascript
if (postData.max_participants && rsvps.length >= parseInt(postData.max_participants)) {
  showToast(t.eventFull || 'Dogodek je poln', 'error');
  return;
}
```

The `handleRSVP` function fetches a post directly from the database and uses `postData.max_participants` (snake_case). However, if the database value is null or undefined, the check fails silently.

**Root Cause**: Direct database query returns snake_case columns without transformation. The check relies on raw database data which may not exist for older events or CSV-imported events.

**Reproduction**:
1. Import event via CSV with max participants
2. Try to RSVP when event is full
3. User can still RSVP despite capacity limit

**Fix Required**: Use consistent data transformation and handle null/undefined cases

---

### 2. ⚠️ CRITICAL: Inconsistent Data Transformation in RSVP Functions
**Location**: `src/App.jsx:3108-3151` (handleRSVP) and `3154-3179` (cancelRSVP)
**Severity**: CRITICAL
**Impact**: Data inconsistency between database queries and app state

**Problem**:
- `loadPosts()` transforms snake_case → camelCase
- `handleRSVP()` and `cancelRSVP()` fetch posts directly WITHOUT transformation
- This creates two different data formats in the app

**Example**:
```javascript
// In loadPosts - TRANSFORMED
const transformedData = data.map(post => ({
  ...post,
  maxParticipants: post.max_participants,
  trainer: post.trener,
  // ...
}));

// In handleRSVP - NOT TRANSFORMED
const { data: postData } = await supabase
  .from('posts')
  .select('*')
  .eq('id', eventId)
  .single();
// postData has max_participants (snake_case)
// But app expects maxParticipants (camelCase)
```

**Root Cause**: No centralized data transformation layer. Each function that queries the database must remember to transform data.

**Fix Required**: Create a reusable transformation function or transform data in handleRSVP/cancelRSVP

---

### 3. ⚠️ CRITICAL: Missing Trainer Data in UI
**Location**: `src/App.jsx:2497-2502` (loadPosts transformation)
**Severity**: HIGH
**Impact**: Trainer names don't display for CSV-imported events

**Problem**:
The database stores trainer in the `trener` column (snake_case), but the UI expects `trainer` (camelCase). The transformation was just added but needs verification.

**Database Schema**:
```sql
trener TEXT  -- Database column name
```

**App Expects**:
```javascript
post.trainer  // UI code at line 563, 570
```

**Current Fix**:
```javascript
// Just added in recent commit
const transformedData = data.map(post => ({
  ...post,
  trainer: post.trener  // Maps trener → trainer
}));
```

**Status**: Fix implemented but needs testing to confirm it works for CSV imports

---

## Medium Severity Issues

### 4. 🟡 Potential Auth State Race Condition
**Location**: `src/App.jsx:2238-2248` (onAuthStateChange)
**Severity**: MEDIUM
**Impact**: Users might see loading screen indefinitely if profile load fails

**Problem**:
```javascript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    setCurrentUser(session.user);
    await loadUserProfile(session.user);  // If this fails...
  } else {
    setCurrentUser(null);
    setUserRole(null);
    setView('home');
    setLoading(false);  // Only called in else branch
  }
});
```

If `loadUserProfile` throws an error, `setLoading(false)` is only called inside loadUserProfile's try/catch. But if the promise rejects before entering the try block, loading stays true forever.

**Fix Required**: Add error handling at the auth state change level

---

### 5. 🟡 Silent Error Handling in Logout
**Location**: `src/App.jsx:2810`
**Severity**: LOW
**Impact**: Logout failures are not communicated to user

**Problem**:
```javascript
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) {}
};
```

If logout fails (network error, Supabase down), the user gets no feedback. They might think they're logged out when they're not.

**Fix Required**: Add user feedback for logout failures

---

## Data Consistency Analysis

### Snake_case vs CamelCase Mapping

| Database Column | App Property | Transformed? | Used In |
|----------------|--------------|--------------|---------|
| `max_participants` | `maxParticipants` | ✅ Yes (loadPosts) | EventCard, EventDetailModal |
| `trener` | `trainer` | ✅ Yes (loadPosts) | EventCard, EditPostModal |
| `show_in_news` | `showInNews` | ✅ Yes (loadPosts) | EventCard, EditPostModal |
| `is_featured` | `isFeatured` | ✅ Yes (loadPosts) | EventCard |
| `max_participants` | `max_participants` | ❌ No (handleRSVP) | RSVP capacity check |

**Issue**: Inconsistent transformation in different code paths

---

## Recommendations

### Immediate Fixes (Critical)
1. **Fix handleRSVP max participants check** - Use proper null handling and consider transforming the fetched data
2. **Add data transformation helper** - Create `transformPostFromDB(post)` function used everywhere
3. **Verify trainer display** - Test CSV import to confirm trainer names show correctly

### Short-term Improvements (Medium)
4. **Add error boundary to auth flow** - Ensure loading state is always resolved
5. **Add logout error handling** - Show toast on logout failure

### Long-term Improvements
6. **Consider using Supabase PostgREST transforms** - Use automatic camelCase conversion
7. **Add TypeScript** - Catch these type mismatches at compile time
8. **Centralize data access** - Create a data layer that always returns transformed data

---

## Testing Checklist

- [ ] Test RSVP to full event (should block)
- [ ] Test RSVP to event with null max_participants (should allow)
- [ ] Test CSV import with trainer and max participants (should display)
- [ ] Test login with non-existent profile (should handle gracefully)
- [ ] Test logout with network offline (should show error)

---

## Conclusion

The codebase is generally well-structured with good retry logic and error handling. However, the data transformation layer needs improvement to ensure consistency between database schema (snake_case) and app code (camelCase).

The most critical issue is the RSVP max participants check which could allow oversubs
cribing to events. This should be fixed immediately.

**Estimated Fix Time**: 2-3 hours
**Risk Level**: Medium (changes affect core functionality but fixes are straightforward)

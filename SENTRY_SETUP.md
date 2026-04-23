# Sentry Setup Guide - VSK Planner

## ✅ Installation Complete!

Sentry has been installed and configured in your app. Now you need to activate it with your own Sentry DSN.

---

## 🔑 Get Your Sentry DSN (5 minutes)

### 1. Create a Free Sentry Account

Go to: **https://sentry.io/signup/**

- **Free tier includes:**
  - 5,000 errors/month
  - 10,000 transactions/month
  - Session replays
  - Performance monitoring
  - **More than enough for your needs!**

### 2. Create a New Project

After signing up:
1. Click **"Create Project"**
2. Select **React** as the platform
3. Name it: `vsk-planner`
4. Click **"Create Project"**

### 3. Copy Your DSN

You'll see a page with code snippets. Look for the **DSN** - it looks like:

```
https://abc123def456@o123456.ingest.sentry.io/789012
```

**Copy this entire URL!**

---

## 📝 Add DSN to Your Code

### Open `src/App.jsx` line 11

Find this line:
```javascript
dsn: "YOUR_SENTRY_DSN_HERE",
```

Replace it with your actual DSN:
```javascript
dsn: "https://abc123def456@o123456.ingest.sentry.io/789012",
```

**Save the file.**

---

## 🚀 Deploy to Production

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Commit
git add .
git commit -m "Add Sentry error monitoring"
git push
```

---

## 🧪 Verify It's Working

### Option 1: Check Sentry Dashboard
1. Go to your Sentry project dashboard
2. Within 5-10 minutes of deployment, you should see:
   - Session data appearing
   - Performance metrics
   - Any errors that occur

### Option 2: Trigger a Test Error
If you want to verify immediately:

1. Open browser console on your live site (F12)
2. Type: `throw new Error("Sentry test error");`
3. Check your Sentry dashboard in 1-2 minutes

You should see the error appear!

---

## 📊 What Sentry Will Track

### Automatically Tracked:
✅ **JavaScript Errors**
- Unhandled promise rejections
- Runtime errors
- React component errors

✅ **Performance Issues**
- Slow page loads
- API call performance
- Database query times

✅ **Session Replays** (When errors occur)
- Video-like replay of user's session
- See exactly what user did before error
- Click paths, inputs, etc.

✅ **Context Data**
- User's browser
- Device type
- Operating system
- Page URL
- User actions

---

## 🔔 Set Up Alerts (Optional but Recommended)

### Email Notifications:
1. Go to Sentry project → **Settings** → **Alerts**
2. Create a new alert rule:
   - **Trigger:** When an issue is first seen
   - **Action:** Send email to [your-email]

### Slack Integration:
1. Go to **Settings** → **Integrations** → **Slack**
2. Connect your workspace
3. Get real-time error notifications!

---

## 📈 Understanding Your Dashboard

### Key Metrics to Monitor:

**Issues Tab:**
- All errors grouped by type
- Frequency of each error
- Affected users count

**Performance Tab:**
- Page load times
- API response times
- Slowest transactions

**Releases Tab:**
- Track errors by deployment
- See if new releases introduced bugs

**Users Tab:**
- See which users hit errors
- Filter by user email

---

## 🎯 Best Practices

### 1. Check Daily (First Week)
- Look for patterns
- Fix high-frequency errors first
- Monitor after each deployment

### 2. Set Up Release Tracking
Add this to your deployment script:

```bash
# After firebase deploy
npx @sentry/cli releases new vsk-planner@1.0.0
npx @sentry/cli releases finalize vsk-planner@1.0.0
```

### 3. Add User Context
In your login function, add:

```javascript
Sentry.setUser({
  email: user.email,
  id: user.uid,
  role: userRole
});
```

### 4. Add Breadcrumbs
For important actions:

```javascript
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'User created new event',
  level: 'info',
});
```

---

## 💰 Cost Management

### Free Tier Limits:
- **5,000 errors/month** → ~167/day
- If you exceed, oldest errors are deleted
- No overage charges

### If You Need More:
- **Developer Plan:** $29/month
- 50,000 errors/month
- 100,000 transactions/month

**You'll likely stay on free tier for months!**

---

## 🔒 Privacy & GDPR

### Sentry is GDPR Compliant:
- Data stored in EU (if selected)
- Data retention: 90 days
- IP anonymization available
- User data scrubbing

### Recommended Settings:
In Sentry dashboard → **Settings** → **Security & Privacy**:

✅ Enable **IP Address Scrubbing**
✅ Enable **Data Scrubbing**
✅ Set **Data Retention:** 30 days

---

## 🆘 Troubleshooting

### Not Seeing Errors in Sentry?

**1. Check DSN is correct**
```javascript
// Should be a real URL, not placeholder
dsn: "https://abc@xyz.ingest.sentry.io/123"
```

**2. Check browser console**
Look for Sentry initialization message

**3. Test with a manual error**
```javascript
try {
  throw new Error("Test error");
} catch (e) {
  Sentry.captureException(e);
}
```

**4. Check `beforeSend` function**
Make sure it's not filtering out all errors

### "Quota Exceeded" Message?

You're hitting the 5,000/month limit:
- Identify top errors and fix them
- Increase sampling rate
- Upgrade to paid plan

---

## 📚 Resources

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Dashboard:** https://sentry.io/organizations/your-org/issues/
- **Pricing:** https://sentry.io/pricing/

---

## ✅ Checklist

- [ ] Created Sentry account
- [ ] Created `vsk-planner` project
- [ ] Copied DSN
- [ ] Added DSN to `src/App.jsx` line 11
- [ ] Deployed to production
- [ ] Verified errors are being tracked
- [ ] Set up email alerts
- [ ] Added to monitoring routine

---

**🎉 You're Done! Your app now has professional error monitoring.**

**Next time you see "something is broken", you'll know exactly what, when, and why!**

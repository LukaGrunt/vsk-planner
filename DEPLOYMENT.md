# VSK Planner - PWA Deployment Guide

## 📱 What You'll Get

After deployment, your app will:
- Have a link like `https://vsk-planner.web.app`
- Install on iPhone/Android like a real app
- Run **fullscreen** (no Safari bar!)
- Have VSK icon on home screen
- Work offline (cached)
- Auto-update when you make changes

---

## 🚀 Step-by-Step Deployment

### Prerequisites
1. **Node.js** - Download from https://nodejs.org (LTS version)
2. **Firebase CLI** - Install after Node.js

### Step 1: Download Project Files

Download all project files to a folder on your computer, for example: `C:\VSK-Planner\` or `~/VSK-Planner/`

Files you need:
```
VSK-Planner/
├── src/
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── manifest.json
│   ├── service-worker.js
│   ├── icon-192.png    ← YOU NEED TO ADD THIS
│   └── icon-512.png    ← YOU NEED TO ADD THIS
├── index.html
├── package.json
├── vite.config.js
├── firebase.json
└── .firebaserc
```

### Step 2: Create App Icons

You need two PNG icons with the VSK logo:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

**Easy way to create icons:**
1. Go to https://www.canva.com or use any image editor
2. Create a 512x512 canvas with dark background (#0a0b0c)
3. Add VSK logo centered
4. Export as PNG → `icon-512.png`
5. Resize to 192x192 → `icon-192.png`
6. Place both in the `public/` folder

### Step 3: Install Dependencies

Open Terminal (Mac) or Command Prompt (Windows):

```bash
# Navigate to project folder
cd path/to/VSK-Planner

# Install project dependencies
npm install

# Install Firebase CLI globally
npm install -g firebase-tools
```

### Step 4: Login to Firebase

```bash
firebase login
```

This opens a browser - log in with your Google account (the one that has the vsk-planner Firebase project).

### Step 5: Build the App

```bash
npm run build
```

This creates a `dist/` folder with your production app.

### Step 6: Deploy to Firebase

```bash
firebase deploy --only hosting
```

**Done!** 🎉

You'll see output like:
```
✔ Deploy complete!

Hosting URL: https://vsk-planner.web.app
```

---

## 📲 Installing on iPhone

1. Open Safari on iPhone
2. Go to `https://vsk-planner.web.app`
3. Tap the **Share button** (box with arrow)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **"Add"**

The app now appears on your home screen with the VSK icon!

---

## 📲 Installing on Android

1. Open Chrome
2. Go to `https://vsk-planner.web.app`
3. Tap the **three dots menu** (top right)
4. Tap **"Add to Home screen"** or **"Install app"**

---

## 🔄 Updating the App

When you make changes to the code:

```bash
# Build new version
npm run build

# Deploy
firebase deploy --only hosting
```

**Users automatically get updates** the next time they open the app!

---

## 🌐 Using Custom Domain (vsk.si)

If you want `app.vsk.si` instead of `vsk-planner.web.app`:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter `app.vsk.si`
4. Add the DNS records shown in Namecheap
5. Wait for verification (can take up to 24h)

---

## 🔧 Firebase Storage Setup (for Photo Upload)

1. Go to Firebase Console → Build → Storage
2. Click "Get Started"
3. In Rules tab, set:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /event-photos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. Click "Publish"

---

## ❓ Troubleshooting

**"npm not found"**
→ Install Node.js from https://nodejs.org

**"firebase not found"**
→ Run `npm install -g firebase-tools`

**Build errors**
→ Make sure you ran `npm install` first

**Blank screen after deploy**
→ Check browser console for errors (F12)

---

## 📁 Project Structure

```
src/App.jsx         - Main application code
src/main.jsx        - React entry point
public/             - Static files (icons, manifest)
index.html          - HTML template with PWA tags
firebase.json       - Firebase hosting config
vite.config.js      - Build configuration
```

---

## 🎯 Quick Commands Reference

```bash
npm install          # Install dependencies (first time)
npm run start        # Run locally for testing
npm run build        # Build for production
firebase deploy      # Deploy to Firebase
```

---

Need help? The app link after deployment: **https://vsk-planner.web.app**

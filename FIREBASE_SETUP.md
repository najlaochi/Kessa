# 🔥 Firebase Setup Guide

## Step-by-Step Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name (e.g., "kids-storytelling")
4. Disable Google Analytics (optional)
5. Click "Create Project"

### 2. Enable Authentication

1. In Firebase Console, click "Authentication" in left sidebar
2. Click "Get Started"
3. Click "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### 3. Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. Select "Start in test mode" (we'll add security rules later)
4. Choose your region (closest to your users)
5. Click "Enable"

### 4. Enable Storage

1. Click "Storage" in left sidebar
2. Click "Get Started"
3. Select "Start in test mode"
4. Click "Next" and "Done"

### 5. Get Firebase Configuration

1. Click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll to "Your apps" section
4. Click the web icon `</>`
5. Register app with a nickname (e.g., "kids-storytelling-web")
6. Copy the configuration values
7. Create `.env` file in project root (copy from `.env.example`)
8. Paste your Firebase config values into `.env`

### 6. Security Rules

The rules now live in `firestore.rules` and `storage.rules`. Deploy them with:

```bash
npx firebase-tools deploy --only firestore:rules,storage
```

Important: "test mode" leaves your database open to anyone and expires after 30 days, after which the app stops working. Deploy these rules before sharing the app.

### 7. Create the Admin (once, in the console)

For safety, the app no longer lets anyone register as admin.

1. Firebase Console → Authentication → Users → **Add user**, then enter your email and password.
2. Copy the new user's **UID**.
3. Firestore → collection `users` → **Add document**, with Document ID = that UID and fields:
   - `email` (string): your email
   - `isAdmin` (boolean): `true`
4. Sign in at `/admin/login`.

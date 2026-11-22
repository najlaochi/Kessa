# 🔧 Troubleshooting Guide

## Issue 1: No Stories Showing in Admin

### Possible Causes:
1. **No stories created yet** - You need to add stories through the admin panel
2. **Firebase connection issue** - Check your .env file
3. **Firestore rules** - Ensure proper security rules are set

### Solutions:

#### Step 1: Verify Firebase Connection
1. Open [debug-firebase.html](file:///c:/kids%20stories%20_%20education/debug-firebase.html) in your browser
2. Check the "Firebase Connection Test" section
3. All credentials should show ✅ Found

#### Step 2: Check Firebase Console
1. Go to https://console.firebase.google.com
2. Open your project: `story-for-kids-1e94b`
3. Go to **Firestore Database**
4. Check if you have these collections:
   - `subjects/` - Should have at least one subject
   - `stories/` - Should have at least one story

#### Step 3: Create Your First Story
If you don't have any stories yet:

1. Run the app: `npm run dev`
2. Go to http://localhost:5174/admin/login
3. **Create admin account** (if not done):
   - Check "Register as first admin"
   - Enter email/password
   - Click "Create Admin Account"
4. **Add a Subject**:
   - Go to "Subjects" tab
   - Click "Add New Subject"
   - Title: "Ocean Adventures" (or any name)
   - Icon: 🌊
   - Order: 1
   - Click Save
5. **Add a Story**:
   - Go to "Stories" tab
   - Click "Add New Story"
   - Title: "The Brave Explorer"
   - Subject: Select "Ocean Adventures"
   - Duration: 5 minutes
   - Content: Copy from [example stories.txt](file:///c:/kids%20stories%20_%20education/example%20stories.txt)
   - **IMPORTANT**: Make sure to use `{HERO}` in the story!
   - Click Save

---

## Issue 2: No Voice Narration

### Possible Causes:
1. **Browser doesn't support Web Speech API**
2. **Voices not loaded yet**
3. **Browser permissions blocked**
4. **Audio autoplay policy**

### Solutions:

#### Quick Test:
1. Open [debug-firebase.html](file:///c:/kids%20stories%20_%20education/debug-firebase.html)
2. Go to "Voice Narration Test" section
3. Click "🔊 Test Voice"
4. You should hear "Hello! This is a test..."

#### If No Sound:

**Option 1: Browser Check**
- Click "📋 List Available Voices"
- You should see a list of voices
- If you see "⏳ Loading voices...", wait a moment and try again
- If you see "❌ Not supported", try a different browser

**Option 2: Try Different Browser**
Web Speech API works best on:
- ✅ Chrome/Edge (Best support)
- ✅ Safari (MacOS/iOS)
- ⚠️ Firefox (Limited support)

**Option 3: Check Browser Permissions**
1. Click the 🔒 lock icon in address bar
2. Make sure "Sound" is allowed
3. Refresh the page

**Option 4: User Interaction Required**
Some browsers require user interaction before playing audio:
1. Click the Play button
2. Wait 1 second
3. Click Play button again if needed

#### Browser-Specific Issues:

**Chrome/Edge:**
- Usually works out of the box
- If not working, check chrome://settings/content/sound

**Firefox:**
- May have limited voice support
- Try enabling in about:config → media.webspeech.synth.enabled

**Safari:**
- Works well on Mac/iOS
- May need user permission on first use

---

## Issue 3: Stories Have No Sound When Playing

### Check These:

1. **Did you use {HERO} placeholder?**
   - Stories MUST contain `{HERO}` for personalization
   - Example: "Once upon a time, {HERO} went on an adventure..."

2. **Is the story text too short?**
   - Very short text might complete quickly
   - Try a longer story

3. **Check browser console for errors:**
   - Press F12 to open developer tools
   - Check Console tab for red errors
   - Share any errors you see

---

## Quick Diagnostic Commands

### Test 1: Standalone Voice Test
```
Open: test-narration.html
Enter name, click Play
Should hear voice immediately
```

### Test 2: Full Debug
```
Open: debug-firebase.html
Run all tests
Share results
```

### Test 3: Check Firebase
```
1. Open Firebase Console
2. Go to Firestore Database
3. Screenshot and share what you see
```

---

## Still Having Issues?

Share the following information:
1. What browser are you using? (Chrome/Firefox/Safari/Edge)
2. What's the exact error message?
3. Screenshot of browser console (F12)
4. Screenshot of debug-firebase.html test results

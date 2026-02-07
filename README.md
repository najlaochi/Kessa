# 🌟 Kids Audio Storytelling App

A magical web application where children can hear personalized bedtime stories with their name as the hero, accompanied by calming background music.

## ✨ Features

### For Kids & Parents
- **Personalized Stories**: Child's name replaces `{HERO}` placeholder in all stories
- **Text-to-Speech Narration**: Calm female voice narrates stories automatically
- **Background Music**: Soothing nighttime music plays during narration
- **Beautiful UI**: Kid-friendly design with animations and glassmorphism effects
- **Easy Navigation**: Simple flow from name entry → subject selection → story → playback

### For Admins
- **Subject Management**: Create and organize story categories
- **Story Editor**: Add/edit stories with rich text editor
- **Live Preview**: See how stories look with hero name replacement
- **Firebase Backend**: Secure cloud storage for all content

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Firebase account (free tier works great!)

### Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**

   a. Go to [Firebase Console](https://console.firebase.google.com/)
   
   b. Create a new project (or use existing)
   
   c. Enable the following services:
      - **Authentication** (Email/Password provider)
      - **Firestore Database** (Start in test mode)
      - **Storage** (Start in test mode)
   
   d. Get your Firebase config:
      - Go to Project Settings → General
      - Scroll to "Your apps" → Web app
      - Copy the configuration values

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Add calm music file**
   
   Place a calm music file (MP3) at: `public/music/calm-night.mp3`
   
   You can find royalty-free lullaby music from:
   - [FreePD](https://freepd.com/)
   - [Pixabay Music](https://pixabay.com/music/)
   - [YouTube Audio Library](https://www.youtube.com/audiolibrary)
   
   Search for: "lullaby", "calm music", "bedtime music", "peaceful"

### Running the App

```bash
npm run dev
```

Visit `http://localhost:5173`

## 📖 Usage Guide

### First Time Setup (Admin)

1. Navigate to `/admin/login`
2. Check "Register as first admin"
3. Enter email and password
4. Click "Create Admin Account"
5. You're now logged in as admin!

### Adding Content (Admin)

1. **Create Subjects**
   - Go to Admin → Subjects
   - Add subject name, emoji icon, and description
   - Examples: 🚀 "Space Adventures", 🦁 "Jungle Tales", 🌊 "Ocean Mysteries"

2. **Create Stories**
   - Go to Admin → Stories → Add New Story
   - Enter story title and select subject
   - Write story content using `{HERO}` as placeholder for child's name
   - Example:
     ```
     Once upon a time, there was a brave explorer named {HERO}.
     {HERO} discovered a magical portal in the backyard.
     With courage, {HERO} stepped through and began an amazing adventure...
     ```
   - Use the Preview button to test with different names!

### Using the App (Kids & Parents)

1. Open the app homepage
2. Enter child's name
3. Choose a story subject
4. Select a story
5. Click "Play Story" to start narration with background music
6. Adjust music volume as needed
7. Enjoy the personalized adventure!

## 🎨 Technology Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Audio**: Web Speech API + Web Audio API
- **Styling**: Custom CSS with glassmorphism
- **Fonts**: Google Fonts (Fredoka, Quicksand)

## 🔒 Firebase Security Rules

Update your Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read subjects and stories
    match /subjects/{document} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /stories/{document} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Only admins can modify user documents
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 📂 Project Structure

```
kids-audio-storytelling/
├── public/
│   └── music/
│       └── calm-night.mp3     # Background music
├── src/
│   ├── components/
│   │   ├── WelcomePage.jsx    # Name input
│   │   ├── SubjectSelector.jsx # Category selection
│   │   ├── StoryBrowser.jsx   # Story list
│   │   ├── AudioPlayer.jsx    # Playback controls
│   │   └── admin/
│   │       ├── AdminLogin.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── SubjectManager.jsx
│   │       ├── StoryManager.jsx
│   │       └── StoryEditor.jsx
│   ├── services/
│   │   ├── firebaseConfig.js  # Firebase init
│   │   ├── authService.js     # Authentication
│   │   ├── storyService.js    # CRUD operations
│   │   └── audioService.js    # TTS + music
│   ├── App.jsx                # Main app + routing
│   ├── main.jsx               # Entry point
│   └── index.css              # Design system
├── .env                       # Firebase config (create from .env.example)
├── .env.example               # Template
└── package.json
```

## 🎵 Audio Features

- **Text-to-Speech**: Uses browser's built-in voices (free!)
- **Calm Female Voice**: Automatically selects gentle female voice
- **Slow Pace**: 0.85× speed for bedtime stories
- **Background Music**: Loops during narration
- **Volume Control**: Adjust music volume independently
- **Progress Tracking**: Visual progress bar

## 🌙 Design Philosophy

- **Kid-Friendly**: Large buttons, vibrant colors, playful animations
- **Calming**: Nighttime color scheme, smooth transitions
- **Magical**: Starry backgrounds, glassmorphism, glowing effects
- **Accessible**: Clear typography, high contrast, touch-friendly

## 🚀 Deployment

### Deploy to Firebase Hosting

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🤝 Contributing

Feel free to:
- Add more story templates
- Improve the design
- Add new features (favorites, history, multiple languages)
- Optimize audio performance

## 📝 License

This project is open source and available for personal and commercial use.

## 🆘 Troubleshooting

**Problem**: "Failed to load voices"
- **Solution**: Some browsers load voices asynchronously. Refresh the page.

**Problem**: Stories not appearing
- **Solution**: Check Firebase Security Rules allow read access to 'stories' collection

**Problem**: Can't login as admin
- **Solution**: Ensure you checked "Register as first admin" when creating the account

**Problem**: Music not playing
- **Solution**: Add `calm-night.mp3` file to `public/music/` folder

## 🎉 Enjoy!

Create magical bedtime stories that make every child the hero of their own adventure! ✨

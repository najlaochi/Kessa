# 🎵 Background Music

## Instructions

Please add a calm, soothing music file for bedtime stories.

### File Location
Place your music file here: `public/music/calm-night.mp3`

### Where to Find Free Music

1. **FreePD** (https://freepd.com/)
   - Search for: "lullaby", "peaceful", "calm"
   - 100% royalty-free

2. **Pixabay Music** (https://pixabay.com/music/)
   - Filter by "Calm" mood
   - Free for commercial use

3. **YouTube Audio Library** (https://studio.youtube.com → Audio Library)
   - Filter by Genre: "Children's" or "Ambient"
   - Mood: "Calm", "Happy"

### Recommended Tracks (Free)
- "Brahms Lullaby" variations
- "Twinkle Twinkle Little Star" instrumental
- Gentle piano lullabies
- Soft music box melodies

### Requirements
- **Format**: MP3
- **Length**: 2-5 minutes (will loop automatically)
- **Volume**: Moderate (app has volume control)
- **Style**: Calm, peaceful, suitable for bedtime

### Alternative
If you don't want to add music, you can modify the AudioPlayer component to not use background music:

In `src/components/AudioPlayer.jsx`, change line ~70:
```javascript
// Instead of:
const musicUrl = '/music/calm-night.mp3';

// Use:
const musicUrl = null; // No background music
```

---

**Note**: The app will work without music, but the audio player will show an error in the console. Adding music greatly enhances the bedtime story experience!

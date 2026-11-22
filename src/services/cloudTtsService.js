/**
 * Cloud TTS Service
 * 
 * Calls the Firebase Cloud Function to generate high-quality audio
 * via Google Cloud Text-to-Speech, then stores it in Firebase Storage.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebaseConfig';

const functions = getFunctions(app);
const generateAudioFn = httpsCallable(functions, 'generateStoryAudio');

/**
 * Generate audio for a story using Google Cloud TTS.
 * 
 * @param {string} storyId - Firestore document ID
 * @param {string} text - Story text to speak
 * @param {string} language - 'en' or 'ar'
 * @returns {{ audioUrl: string }} - URL of the generated MP3
 */
export async function generateStoryAudio(storyId, text, language) {
    console.log(`🎤 Requesting Cloud TTS: ${language}, ${text.length} chars`);

    const result = await generateAudioFn({ storyId, text, language });
    console.log('✅ Cloud TTS result:', result.data);

    return result.data; // { audioUrl }
}

export default { generateStoryAudio };

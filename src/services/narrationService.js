import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';
import app, { auth } from './firebaseConfig';

const REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
const functions = getFunctions(app, REGION);
const generateNarration = httpsCallable(functions, 'generateNarration', { timeout: 150000 });

/**
 * Get an MP3 URL for this story read with the child's name.
 * Visitors are signed in anonymously so the server can apply fair-use limits.
 */
export async function getNarrationUrl(storyId, childName, language) {
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }
    const result = await generateNarration({ storyId, childName, language });
    return result.data.url;
}

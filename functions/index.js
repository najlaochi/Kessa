/**
 * Kessa — natural voice narration
 *
 * generateNarration({ storyId, childName, language })
 *   → { url }  an MP3 of the story read by a natural Google voice, with the child's name in it.
 *
 * Each (story text + name + language) is generated once and saved in Storage under
 * narration/, so a second play of the same story with the same name costs nothing.
 * The Google credentials stay on the server; nothing secret is sent to the browser.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import textToSpeech from '@google-cloud/text-to-speech';
import { createHash, randomUUID } from 'node:crypto';

initializeApp();
const db = getFirestore();
const ttsClient = new textToSpeech.TextToSpeechClient();

// ---------- Settings you may want to change ----------

// Must match VITE_FIREBASE_FUNCTIONS_REGION in the web app's .env
const REGION = 'europe-west1';

// Voices: listen to samples at https://cloud.google.com/text-to-speech/docs/voices
// and replace the names here to change the narrator.
const VOICES = {
    ar: { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-A', speakingRate: 0.9, pitch: 0 },
    en: { languageCode: 'en-US', name: 'en-US-Neural2-F', speakingRate: 0.9, pitch: 0 },
};

// Cost protection: new (not cached) narrations allowed per day
const DAILY_LIMIT_PER_USER = 15;
const DAILY_LIMIT_TOTAL = 300;

// Google accepts at most 5000 bytes per request; stay under it
const MAX_CHUNK_BYTES = 4500;

// ---------- Helpers ----------

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'’-]{0,29}$/u;

function cleanStoryText(text) {
    return (text || '')
        .replace(/^[-*_]{3,}$/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/\*([^*\n]+?)\*/g, '$1')
        .replace(/^>\s+/gm, '')
        .replace(/[-–—]{3,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function replaceHeroName(text, name) {
    return text.replace(/{HERO}/g, name).replace(/{بطل}/g, name);
}

const byteLength = (s) => Buffer.byteLength(s, 'utf8');

/** Split text into pieces under MAX_CHUNK_BYTES, cutting at sentence ends where possible. */
function splitIntoChunks(text) {
    const sentences = text.match(/[^.!?؟\n]+[.!?؟]*[\s\n]*|[.!?؟\n]+/g) || [text];
    const chunks = [];
    let current = '';

    const pushWords = (sentence) => {
        // A single sentence longer than the limit: cut between words
        let piece = '';
        for (const word of sentence.split(/(\s+)/)) {
            if (byteLength(piece + word) > MAX_CHUNK_BYTES) {
                if (piece.trim()) chunks.push(piece.trim());
                piece = word;
            } else {
                piece += word;
            }
        }
        return piece;
    };

    for (const sentence of sentences) {
        if (byteLength(current + sentence) <= MAX_CHUNK_BYTES) {
            current += sentence;
            continue;
        }
        if (current.trim()) chunks.push(current.trim());
        current = byteLength(sentence) > MAX_CHUNK_BYTES ? pushWords(sentence) : sentence;
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

function publicUrl(bucketName, path, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** Count one new narration against the daily limits; throws when a limit is reached. */
async function useQuota(uid) {
    const day = new Date().toISOString().slice(0, 10);
    const userRef = db.collection('narrationUsage').doc(`${uid}_${day}`);
    const totalRef = db.collection('narrationUsage').doc(`total_${day}`);

    await db.runTransaction(async (tx) => {
        const [userSnap, totalSnap] = await Promise.all([tx.get(userRef), tx.get(totalRef)]);
        const userCount = userSnap.exists ? userSnap.data().count : 0;
        const totalCount = totalSnap.exists ? totalSnap.data().count : 0;
        if (userCount >= DAILY_LIMIT_PER_USER || totalCount >= DAILY_LIMIT_TOTAL) {
            throw new HttpsError('resource-exhausted', 'Daily narration limit reached. Please try again tomorrow.');
        }
        tx.set(userRef, { count: FieldValue.increment(1), day }, { merge: true });
        tx.set(totalRef, { count: FieldValue.increment(1), day }, { merge: true });
    });
}

// ---------- The function ----------

export const generateNarration = onCall(
    { region: REGION, memory: '512MiB', timeoutSeconds: 120, maxInstances: 5 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Please open the app again and retry.');
        }

        const { storyId, language } = request.data || {};
        const childName = String(request.data?.childName || '').trim();
        const lang = language === 'ar' ? 'ar' : 'en';

        if (typeof storyId !== 'string' || !storyId) {
            throw new HttpsError('invalid-argument', 'Missing story.');
        }
        if (!NAME_PATTERN.test(childName)) {
            throw new HttpsError('invalid-argument', 'Please use a name with letters only (up to 30).');
        }

        const storySnap = await db.collection('stories').doc(storyId).get();
        if (!storySnap.exists) {
            throw new HttpsError('not-found', 'Story not found.');
        }
        const story = storySnap.data();
        const content = lang === 'ar'
            ? (story.content_ar || '')
            : (story.content_en || story.content || '');
        if (!content.trim()) {
            throw new HttpsError('failed-precondition', 'This story has no text in this language.');
        }

        const text = replaceHeroName(cleanStoryText(content), childName);
        const voice = VOICES[lang];

        // Same text + name + voice → same file, so edits to a story create a fresh recording
        const hash = createHash('sha256')
            .update([lang, voice.name, voice.speakingRate, childName.toLowerCase(), text].join('|'))
            .digest('hex')
            .slice(0, 32);
        const path = `narration/${storyId}/${lang}/${hash}.mp3`;

        const bucket = getStorage().bucket();
        const file = bucket.file(path);

        const [exists] = await file.exists();
        if (exists) {
            const [metadata] = await file.getMetadata();
            let token = metadata.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
            if (!token) {
                token = randomUUID();
                await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
            }
            return { url: publicUrl(bucket.name, path, token), cached: true };
        }

        await useQuota(request.auth.uid);

        const buffers = [];
        for (const chunk of splitIntoChunks(text)) {
            const [response] = await ttsClient.synthesizeSpeech({
                input: { text: chunk },
                voice: { languageCode: voice.languageCode, name: voice.name },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: voice.speakingRate,
                    pitch: voice.pitch,
                    sampleRateHertz: 24000,
                },
            });
            buffers.push(Buffer.from(response.audioContent));
        }

        // MP3 pieces with the same settings can be joined end to end
        const token = randomUUID();
        await file.save(Buffer.concat(buffers), {
            contentType: 'audio/mpeg',
            resumable: false,
            metadata: {
                cacheControl: 'public, max-age=31536000',
                metadata: { firebaseStorageDownloadTokens: token },
            },
        });

        return { url: publicUrl(bucket.name, path, token), cached: false };
    }
);

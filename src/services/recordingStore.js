/**
 * Parent recordings, kept only on this phone/computer (IndexedDB).
 * Nothing is uploaded, so it is free and private.
 */
const DB_NAME = 'kessa-recordings';
const STORE = 'recordings';

function openDb() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('This browser cannot save recordings'));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function withStore(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
            db.close();
            resolve(request?.result);
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

const keyFor = (storyId, language) => `${storyId}_${language}`;

export async function saveRecording(storyId, language, blob, childName) {
    await withStore('readwrite', (store) => store.put({
        blob,
        mimeType: blob.type,
        childName,
        savedAt: Date.now(),
    }, keyFor(storyId, language)));
    // Ask the browser not to clear our data when space is low
    try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
}

export async function getRecording(storyId, language) {
    try {
        return (await withStore('readonly', (store) => store.get(keyFor(storyId, language)))) || null;
    } catch {
        return null;
    }
}

export async function deleteRecording(storyId, language) {
    await withStore('readwrite', (store) => store.delete(keyFor(storyId, language)));
}

/** Best recording format this browser supports (Safari uses mp4, Chrome/Android webm). */
export function pickMimeType() {
    if (typeof MediaRecorder === 'undefined') return null;
    const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
    return options.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig';

const MAX_BYTES = 25 * 1024 * 1024; // must match storage.rules

/**
 * Upload a file to Firebase Storage under stories/ and return its public URL.
 * Only admins can write (see storage.rules).
 */
export const uploadStoryFile = async (file, kind = 'images') => {
    if (!file) throw new Error('No file selected');
    if (file.size > MAX_BYTES) throw new Error('File is larger than 25 MB');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `stories/${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
    const fileRef = ref(storage, path);

    await uploadBytes(fileRef, file, { contentType: file.type });
    return getDownloadURL(fileRef);
};

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Replace {HERO} or {بطل} placeholder with child's name in story text
 * Supports both English and Arabic placeholders
 */
export const replaceHeroName = (storyText, childName) => {
    if (!storyText || !childName) return storyText;

    // Replace both English {HERO} and Arabic {بطل} placeholders
    return storyText
        .replace(/{HERO}/g, childName)
        .replace(/{بطل}/g, childName);
};

// ==================== SUBJECTS ====================

/**
 * Get all subjects
 */
export const getAllSubjects = async () => {
    try {
        const querySnapshot = await getDocs(
            query(collection(db, 'subjects'), orderBy('order', 'asc'))
        );
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
    }
};

/**
 * Get a single subject by ID
 */
export const getSubjectById = async (subjectId) => {
    try {
        const docSnap = await getDoc(doc(db, 'subjects', subjectId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching subject:', error);
        return null;
    }
};

/**
 * Add a new subject
 */
export const addSubject = async (subjectData) => {
    try {
        const docRef = await addDoc(collection(db, 'subjects'), {
            ...subjectData,
            createdAt: new Date()
        });
        return { id: docRef.id, ...subjectData };
    } catch (error) {
        console.error('Error adding subject:', error);
        throw error;
    }
};

/**
 * Update a subject
 */
export const updateSubject = async (subjectId, subjectData) => {
    try {
        await updateDoc(doc(db, 'subjects', subjectId), subjectData);
        return { id: subjectId, ...subjectData };
    } catch (error) {
        console.error('Error updating subject:', error);
        throw error;
    }
};

/**
 * Delete a subject
 */
export const deleteSubject = async (subjectId) => {
    try {
        await deleteDoc(doc(db, 'subjects', subjectId));
    } catch (error) {
        console.error('Error deleting subject:', error);
        throw error;
    }
};

// ==================== STORIES ====================

/**
 * Get all stories for a subject
 */
export const getStoriesBySubject = async (subjectId) => {
    try {
        const q = query(
            collection(db, 'stories'),
            where('subjectId', '==', subjectId)
            // Temporarily removed orderBy - add back after fixing createdAt timestamps
            // orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching stories:', error);
        return [];
    }
};

/**
 * Get all stories (for admin)
 */
export const getAllStories = async () => {
    try {
        const querySnapshot = await getDocs(
            query(collection(db, 'stories'), orderBy('createdAt', 'desc'))
        );
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching all stories:', error);
        return [];
    }
};

/**
 * Get a single story by ID
 */
export const getStoryById = async (storyId) => {
    try {
        const docSnap = await getDoc(doc(db, 'stories', storyId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching story:', error);
        return null;
    }
};

/**
 * Add a new story
 */
export const addStory = async (storyData) => {
    try {
        const docRef = await addDoc(collection(db, 'stories'), {
            ...storyData,
            createdAt: new Date(),
            publishedAt: new Date()
        });
        return { id: docRef.id, ...storyData };
    } catch (error) {
        console.error('Error adding story:', error);
        throw error;
    }
};

/**
 * Update a story
 */
export const updateStory = async (storyId, storyData) => {
    try {
        await updateDoc(doc(db, 'stories', storyId), storyData);
        return { id: storyId, ...storyData };
    } catch (error) {
        console.error('Error updating story:', error);
        throw error;
    }
};

/**
 * Delete a story
 */
export const deleteStory = async (storyId) => {
    try {
        await deleteDoc(doc(db, 'stories', storyId));
    } catch (error) {
        console.error('Error deleting story:', error);
        throw error;
    }
};

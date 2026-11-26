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
    orderBy,
    limit,
    serverTimestamp
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

/**
 * Story title / content in the chosen language, with fallbacks for older stories
 */
/** 'boy' or 'girl', chosen on the welcome page (stories can have a girl version) */
export const getChildGender = () => (localStorage.getItem('childGender') === 'girl' ? 'girl' : 'boy');

/** True when this story has a girl version in this language (content_ar_girl / content_en_girl) */
const hasGirlVersion = (story, language) => !!story?.[`content_${language}_girl`]?.trim();

export const getStoryTitle = (story, language = 'en', gender = getChildGender()) => {
    if (!story) return '';
    const lang = language === 'ar' ? 'ar' : 'en';
    if (gender === 'girl' && hasGirlVersion(story, lang) && story[`title_${lang}_girl`]) {
        return story[`title_${lang}_girl`];
    }
    if (lang === 'ar') return story.title_ar || story.title_en || story.title || '';
    return story.title_en || story.title || story.title_ar || '';
};

export const getStoryContent = (story, language = 'en', gender = getChildGender()) => {
    if (!story) return '';
    const lang = language === 'ar' ? 'ar' : 'en';
    if (gender === 'girl' && hasGirlVersion(story, lang)) return story[`content_${lang}_girl`];
    if (lang === 'ar') return story.content_ar || story.content_en || story.content || '';
    return story.content_en || story.content || '';
};

/** Which version of the story is shown: 'ar', 'ar_girl', 'en' or 'en_girl' (keeps recordings apart) */
export const getVersionKey = (story, language = 'en', gender = getChildGender()) => {
    const lang = language === 'ar' ? 'ar' : 'en';
    return gender === 'girl' && hasGirlVersion(story, lang) ? `${lang}_girl` : lang;
};

/**
 * The "Kessa voice" recording (uploaded or recorded in admin) for the version the child sees.
 * Girls get narrationUrl_<lang>_girl when the story has a girl version.
 */
export const getKessaNarrationUrl = (story, language = 'en', gender = getChildGender()) => {
    if (!story) return '';
    return story[`narrationUrl_${getVersionKey(story, language, gender)}`] || '';
};

/**
 * Which language the content returned by getStoryContent is really in
 * (an Arabic user may get English content when no Arabic version exists)
 */
export const getContentLanguage = (story, language = 'en') => {
    if (language === 'ar' && story?.content_ar) return 'ar';
    return 'en';
};

// ==================== FREE STORIES & WAITLIST ====================

/**
 * Stories are open when marked "free" in the admin editor.
 * If no story is marked free yet, every story stays open (so nothing breaks before you choose).
 */
export const hasFreeStoriesConfigured = async () => {
    try {
        const snap = await getDocs(query(collection(db, 'stories'), where('isFree', '==', true), limit(1)));
        return !snap.empty;
    } catch (error) {
        console.error('Error checking free stories:', error);
        return false;
    }
};

export const isStoryOpen = (story, freeConfigured) => !freeConfigured || story?.isFree === true;

/** Every story, free ones first, then newest first. Works even if some stories have no createdAt. */
export const getStoriesForListing = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'stories'));
        const toTime = (value) => (value?.toMillis ? value.toMillis() : value ? new Date(value).getTime() : 0);
        return snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.isFree === true) - (a.isFree === true) || toTime(b.createdAt) - toTime(a.createdAt));
    } catch (error) {
        console.error('Error fetching stories:', error);
        return [];
    }
};

/** Parents leave an email to hear about new stories. Only admins can read the list. */
export const joinWaitlist = async (email, language) => {
    const clean = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 200) {
        throw new Error('invalid-email');
    }
    await addDoc(collection(db, 'waitlist'), {
        email: clean,
        language: language === 'ar' ? 'ar' : 'en',
        createdAt: serverTimestamp()
    });
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

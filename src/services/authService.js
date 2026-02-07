import {
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

/**
 * Check if a user is an admin
 */
export const checkIsAdmin = async (userId) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data().isAdmin === true;
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

/**
 * Sign in admin user
 */
export const signInAdmin = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const isAdmin = await checkIsAdmin(userCredential.user.uid);

        if (!isAdmin) {
            await signOut(auth);
            throw new Error('You do not have admin privileges');
        }

        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Register first admin user (call this only once to create the initial admin)
 */
export const registerFirstAdmin = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Create user document with admin flag
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email,
            isAdmin: true,
            createdAt: new Date()
        });

        return userCredential.user;
    } catch (error) {
        console.error('Error registering admin:', error);
        throw error;
    }
};

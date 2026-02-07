// Firebase Data Checker - Add this to check your database
// Run this in browser console at http://localhost:5174

import { collection, getDocs } from 'firebase/firestore';
import { db } from './services/firebaseConfig';

async function checkFirebaseData() {
    console.log('🔍 Checking Firebase Data...\n');

    try {
        // Check Subjects
        console.log('📁 SUBJECTS:');
        const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
        console.log(`Found ${subjectsSnapshot.size} subjects`);

        subjectsSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`  - ${data.icon} ${data.name} (ID: ${doc.id})`);
        });

        console.log('\n📖 STORIES:');
        const storiesSnapshot = await getDocs(collection(db, 'stories'));
        console.log(`Found ${storiesSnapshot.size} stories`);

        storiesSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`  - ${data.title}`);
            console.log(`    Subject ID: ${data.subjectId}`);
            console.log(`    Has {HERO}: ${data.content?.includes('{HERO}') ? 'YES ✅' : 'NO ❌'}`);
            console.log('');
        });

        // Check for mismatch
        const subjectIds = [];
        subjectsSnapshot.forEach(doc => subjectIds.push(doc.id));

        console.log('\n🔗 CHECKING RELATIONSHIPS:');
        storiesSnapshot.forEach((doc) => {
            const data = doc.data();
            const hasMatch = subjectIds.includes(data.subjectId);
            if (!hasMatch) {
                console.log(`⚠️ WARNING: Story "${data.title}" has subjectId "${data.subjectId}" which doesn't match any subject!`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the check
checkFirebaseData();

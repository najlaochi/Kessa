import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import WelcomePage from './components/WelcomePage';
import StoryList from './components/StoryList';
import RecordStory from './components/RecordStory';
import AudioPlayer from './components/AudioPlayer';
import PrintableStory from './components/PrintableStory';
import PrivacyPolicy from './components/PrivacyPolicy';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import SubjectManager from './components/admin/SubjectManager';
import StoryManager from './components/admin/StoryManager';
import StoryEditor from './components/admin/StoryEditor';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { checkIsAdmin } from './services/authService';

function App() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [childName, setChildName] = useState(localStorage.getItem('childName') || '');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const adminStatus = await checkIsAdmin(currentUser.uid);
                setIsAdmin(adminStatus);
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateChildName = (name) => {
        setChildName(name);
        localStorage.setItem('childName', name);
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                {/* User Routes */}
                <Route path="/" element={<WelcomePage onNameSubmit={updateChildName} />} />
                <Route path="/stories" element={<StoryList childName={childName} />} />
                {/* Old category pages now go to the single stories list */}
                <Route path="/subjects" element={<Navigate to="/stories" replace />} />
                <Route path="/stories/:subjectId" element={<Navigate to="/stories" replace />} />
                <Route path="/record/:storyId" element={<RecordStory childName={childName} />} />
                <Route path="/play/:storyId" element={<AudioPlayer childName={childName} />} />
                <Route path="/print/:storyId" element={<PrintableStory childName={childName} />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                    path="/admin/dashboard"
                    element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin/login" />}
                />
                <Route
                    path="/admin/subjects"
                    element={isAdmin ? <SubjectManager /> : <Navigate to="/admin/login" />}
                />
                <Route
                    path="/admin/stories"
                    element={isAdmin ? <StoryManager /> : <Navigate to="/admin/login" />}
                />
                <Route
                    path="/admin/stories/new"
                    element={isAdmin ? <StoryEditor /> : <Navigate to="/admin/login" />}
                />
                <Route
                    path="/admin/stories/edit/:id"
                    element={isAdmin ? <StoryEditor /> : <Navigate to="/admin/login" />}
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;

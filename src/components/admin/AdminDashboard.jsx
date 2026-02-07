import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signOutUser } from '../../services/authService';
import { getAllSubjects, getAllStories } from '../../services/storyService';

function AdminDashboard() {
    const [stats, setStats] = useState({
        subjects: 0,
        stories: 0
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const [subjects, stories] = await Promise.all([
            getAllSubjects(),
            getAllStories()
        ]);

        setStats({
            subjects: subjects.length,
            stories: stories.length
        });
    };

    const handleSignOut = async () => {
        try {
            await signOutUser();
            window.location.href = '/admin/login';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-sidebar">
                <h2 style={{ marginBottom: '2rem', color: 'white' }}>📚 Admin Panel</h2>

                <nav>
                    <Link to="/admin/dashboard" className="admin-nav-link active">
                        🏠 Dashboard
                    </Link>
                    <Link to="/admin/subjects" className="admin-nav-link">
                        📁 Subjects
                    </Link>
                    <Link to="/admin/stories" className="admin-nav-link">
                        📖 Stories
                    </Link>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <Link to="/" className="admin-nav-link">
                        🌟 View App
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="admin-nav-link"
                        style={{ width: '100%', textAlign: 'left', background: 'none' }}
                    >
                        🚪 Sign Out
                    </button>
                </div>
            </div>

            <div className="admin-content">
                <h1 style={{ marginBottom: '2rem', color: 'white' }}>Dashboard</h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                    <div className="admin-card">
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                        <h3 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'white' }}>{stats.subjects}</h3>
                        <p style={{ opacity: 0.8 }}>Subjects</p>
                        <Link to="/admin/subjects" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Manage Subjects
                        </Link>
                    </div>

                    <div className="admin-card">
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
                        <h3 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'white' }}>{stats.stories}</h3>
                        <p style={{ opacity: 0.8 }}>Stories</p>
                        <Link to="/admin/stories" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Manage Stories
                        </Link>
                    </div>
                </div>

                <div className="admin-card" style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'white' }}>Quick Start Guide</h3>
                    <ol style={{ lineHeight: '2', paddingLeft: '1.5rem' }}>
                        <li>Create subjects (categories) for your stories</li>
                        <li>Add stories to your subjects using the {'{HERO}'} placeholder for the child's name</li>
                        <li>Stories will automatically replace {'{HERO}'} with the child's name during playback</li>
                        <li>The app will use text-to-speech to narrate stories with calm background music</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;

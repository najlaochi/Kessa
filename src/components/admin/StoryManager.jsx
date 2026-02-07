import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllStories, getAllSubjects, deleteStory } from '../../services/storyService';

function StoryManager() {
    const [stories, setStories] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [storiesData, subjectsData] = await Promise.all([
            getAllStories(),
            getAllSubjects()
        ]);
        setStories(storiesData);
        setSubjects(subjectsData);
        setLoading(false);
    };

    const handleDelete = async (id, title) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            try {
                await deleteStory(id);
                loadData();
            } catch (error) {
                alert('Error deleting story: ' + error.message);
            }
        }
    };

    const getSubjectName = (subjectId) => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name : 'Unknown';
    };

    if (loading) {
        return (
            <div className="admin-layout">
                <AdminSidebar />
                <div className="admin-content">
                    <div className="loading">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <AdminSidebar />

            <div className="admin-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'white' }}>Manage Stories</h1>
                    <Link to="/admin/stories/new" className="btn btn-primary">
                        + Add New Story
                    </Link>
                </div>

                <div className="admin-card">
                    <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>All Stories ({stories.length})</h3>

                    {stories.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
                                No stories yet. Create your first story!
                            </p>
                            <Link to="/admin/stories/new" className="btn btn-primary">
                                + Create First Story
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {stories.map((story) => (
                                <div
                                    key={story.id}
                                    style={{
                                        padding: '1.5rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'start'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                                            {story.title}
                                        </h4>
                                        <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                            Subject: <strong>{getSubjectName(story.subjectId)}</strong>
                                        </p>
                                        {story.duration && (
                                            <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>
                                                ⏱️ ~{story.duration} minutes
                                            </p>
                                        )}
                                        <p style={{
                                            marginTop: '0.5rem',
                                            fontSize: '0.85rem',
                                            opacity: 0.5,
                                            maxWidth: '500px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {story.content?.substring(0, 100)}...
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link
                                            to={`/admin/stories/edit/${story.id}`}
                                            className="btn"
                                            style={{ background: 'var(--secondary-blue)', color: 'white' }}
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(story.id, story.title)}
                                            className="btn"
                                            style={{ background: 'var(--error)', color: 'white' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AdminSidebar() {
    return (
        <div className="admin-sidebar">
            <h2 style={{ marginBottom: '2rem', color: 'white' }}>📚 Admin Panel</h2>
            <nav>
                <Link to="/admin/dashboard" className="admin-nav-link">🏠 Dashboard</Link>
                <Link to="/admin/subjects" className="admin-nav-link">📁 Subjects</Link>
                <Link to="/admin/stories" className="admin-nav-link active">📖 Stories</Link>
            </nav>
        </div>
    );
}

export default StoryManager;

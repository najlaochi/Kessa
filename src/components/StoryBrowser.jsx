import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStoriesBySubject, getSubjectById } from '../services/storyService';

function StoryBrowser({ childName }) {
    const [stories, setStories] = useState([]);
    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(true);
    const { subjectId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }

        loadData();
    }, [subjectId, childName, navigate]);

    const loadData = async () => {
        setLoading(true);
        const [subjectData, storiesData] = await Promise.all([
            getSubjectById(subjectId),
            getStoriesBySubject(subjectId)
        ]);

        setSubject(subjectData);

        // Get user's language preference
        const language = localStorage.getItem('language') || 'en';

        // Filter stories to only show ones that have content in the user's language
        const filteredStories = storiesData.filter(story => {
            if (language === 'ar') {
                // Arabic users: ONLY show stories with Arabic content
                return story.content_ar && story.content_ar.trim() !== '';
            } else {
                // English users: show stories with English content OR old stories (backward compatibility)
                return (story.content_en && story.content_en.trim() !== '') ||
                    (story.content && story.content.trim() !== '');
            }
        });

        setStories(filteredStories);
        setLoading(false);
    };

    // Helper function to get story title in user's language
    const getStoryTitle = (story) => {
        const language = localStorage.getItem('language') || 'en';
        if (language === 'ar') {
            return story.title_ar || story.title_en || story.title || 'Untitled';
        } else {
            return story.title_en || story.title || 'Untitled';
        }
    };

    const handleStoryClick = (storyId) => {
        navigate(`/play/${storyId}`);
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

    if (!subject) {
        return (
            <div className="page">
                <div className="glass-card text-center">
                    <h3>Subject not found!</h3>
                    <button className="btn btn-primary mt-3" onClick={() => navigate('/subjects')}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            {/* Background Stars */}
            <div className="stars">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                    <h1 className="page-title">
                        {subject.icon} {subject.name}
                    </h1>
                    <p className="page-subtitle">
                        {subject.description}
                    </p>
                </div>

                {stories.length === 0 ? (
                    <div className="glass-card text-center">
                        <h3 style={{ marginBottom: '1rem' }}>📝 No Stories Yet!</h3>
                        <p>This subject doesn't have any stories yet.</p>
                        <p>Check back soon for new adventures!</p>
                        <button
                            className="btn btn-primary mt-3"
                            onClick={() => navigate('/subjects')}
                        >
                            Choose Another Subject
                        </button>
                    </div>
                ) : (
                    <div className="card-grid">
                        {stories.map((story) => (
                            <div
                                key={story.id}
                                className="story-card"
                                onClick={() => handleStoryClick(story.id)}
                            >
                                {story.thumbnailUrl && (
                                    <img
                                        src={story.thumbnailUrl}
                                        alt={story.title}
                                        style={{
                                            width: '100%',
                                            height: '150px',
                                            objectFit: 'cover',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: 'var(--spacing-sm)'
                                        }}
                                    />
                                )}
                                <h3 className="story-card-title">{getStoryTitle(story)}</h3>
                                {story.duration && (
                                    <p className="story-card-desc">
                                        ⏱️ About {story.duration} minutes
                                    </p>
                                )}
                                <div style={{ marginTop: '1rem' }}>
                                    <span style={{
                                        background: 'var(--primary-purple)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: '0.9rem',
                                        display: 'inline-block'
                                    }}>
                                        Listen Now 🎧
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/subjects')}
                    >
                        ← Back to Subjects
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StoryBrowser;

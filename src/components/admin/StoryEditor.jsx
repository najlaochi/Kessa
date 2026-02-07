import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAllSubjects, addStory, getStoryById, updateStory, replaceHeroName } from '../../services/storyService';

function StoryEditor() {
    const [subjects, setSubjects] = useState([]);
    const [story, setStory] = useState({
        title_en: '',
        title_ar: '',
        content_en: '',
        content_ar: '',
        subjectId: '',
        duration: 5
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewName, setPreviewName] = useState('Alex');
    const [showPreview, setShowPreview] = useState(false);
    const [activeTab, setActiveTab] = useState('en'); // 'en' or 'ar'
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const subjectsData = await getAllSubjects();
        setSubjects(subjectsData);

        if (isEditing) {
            const storyData = await getStoryById(id);
            if (storyData) {
                // Handle backward compatibility with old schema
                setStory({
                    title_en: storyData.title_en || storyData.title || '',
                    title_ar: storyData.title_ar || '',
                    content_en: storyData.content_en || storyData.content || '',
                    content_ar: storyData.content_ar || '',
                    subjectId: storyData.subjectId,
                    duration: storyData.duration || 5
                });
            }
        }

        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!story.subjectId) {
            alert('Please select a subject');
            return;
        }

        // Check if at least one language has content
        if (!story.content_en && !story.content_ar) {
            alert('Please provide content in at least one language (English or Arabic)');
            return;
        }

        // Validate English content if provided
        if (story.content_en && !story.content_en.includes('{HERO}')) {
            if (!window.confirm('English story doesn\'t include {HERO} placeholder. Continue anyway?')) {
                return;
            }
        }

        // Validate Arabic content if provided
        if (story.content_ar && !story.content_ar.includes('{بطل}')) {
            if (!window.confirm('Arabic story doesn\'t include {بطل} placeholder. Continue anyway?')) {
                return;
            }
        }

        setSaving(true);

        try {
            if (isEditing) {
                await updateStory(id, story);
            } else {
                await addStory(story);
            }
            navigate('/admin/stories');
        } catch (error) {
            alert('Error saving story: ' + error.message);
        } finally {
            setSaving(false);
        }
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
                <h1 style={{ marginBottom: '2rem', color: 'white' }}>
                    {isEditing ? 'Edit Story' : 'Create New Story'}
                </h1>

                <div className="admin-card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Subject Category *</label>
                            <select
                                className="form-select"
                                value={story.subjectId}
                                onChange={(e) => setStory({ ...story, subjectId: e.target.value })}
                                required
                            >
                                <option value="">Select a subject...</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.icon} {subject.name}
                                    </option>
                                ))}
                            </select>
                            {subjects.length === 0 && (
                                <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>
                                    No subjects available. <Link to="/admin/subjects" style={{ color: 'var(--primary-purple-light)' }}>Create one first</Link>
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Estimated Duration (minutes)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={story.duration}
                                onChange={(e) => setStory({ ...story, duration: parseInt(e.target.value) })}
                                min="1"
                                max="30"
                            />
                        </div>

                        {/* Language Tabs */}
                        <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('en')}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: activeTab === 'en' ? 'var(--primary-purple)' : 'transparent',
                                        color: 'white',
                                        border: 'none',
                                        borderBottom: activeTab === 'en' ? '3px solid var(--primary-purple-light)' : 'none',
                                        cursor: 'pointer',
                                        fontWeight: activeTab === 'en' ? 'bold' : 'normal',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    🇬🇧 English
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('ar')}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: activeTab === 'ar' ? 'var(--primary-purple)' : 'transparent',
                                        color: 'white',
                                        border: 'none',
                                        borderBottom: activeTab === 'ar' ? '3px solid var(--primary-purple-light)' : 'none',
                                        cursor: 'pointer',
                                        fontWeight: activeTab === 'ar' ? 'bold' : 'normal',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    🇸🇦 العربية
                                </button>
                            </div>
                        </div>

                        {/* English Content */}
                        {activeTab === 'en' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">English Title</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={story.title_en}
                                        onChange={(e) => setStory({ ...story, title_en: e.target.value })}
                                        placeholder="e.g., The Brave Space Explorer"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">English Story Content</label>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                                        Use <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                            {'{HERO}'}
                                        </code> as a placeholder for the child's name
                                    </p>
                                    <textarea
                                        className="form-textarea"
                                        value={story.content_en}
                                        onChange={(e) => setStory({ ...story, content_en: e.target.value })}
                                        placeholder={`Once upon a time, there was a brave hero named {HERO}.\n\nOne day, {HERO} discovered a magical portal...`}
                                        rows="15"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                        Word count: {story.content_en.split(/\s+/).filter(w => w).length}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Arabic Content */}
                        {activeTab === 'ar' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Arabic Title / العنوان بالعربية</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={story.title_ar}
                                        onChange={(e) => setStory({ ...story, title_ar: e.target.value })}
                                        placeholder="مثلاً: المستكشف الفضائي الشجاع"
                                        style={{ direction: 'rtl', fontFamily: 'var(--font-body)' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Arabic Story Content / المحتوى بالعربية</label>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem', direction: 'rtl' }}>
                                        استخدم <code style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                            {'{بطل}'}
                                        </code> كعنصر نائب لاسم الطفل
                                    </p>
                                    <textarea
                                        className="form-textarea"
                                        value={story.content_ar}
                                        onChange={(e) => setStory({ ...story, content_ar: e.target.value })}
                                        placeholder="كان يا ما كان، طفل شجاع اسمه {بطل}.\n\nفي يوم من الأيام، اكتشف {بطل} بوابة سحرية..."
                                        rows="15"
                                        style={{ direction: 'rtl', fontFamily: 'var(--font-body)' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem', direction: 'rtl' }}>
                                        عدد الكلمات: {story.content_ar.split(/\s+/).filter(w => w).length}
                                    </p>
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : (isEditing ? '💾 Update Story' : '✨ Create Story')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                {showPreview ? 'Hide Preview' : '👁️ Preview'}
                            </button>
                            <Link to="/admin/stories" className="btn" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Preview */}
                {showPreview && (
                    <div className="admin-card" style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Story Preview</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Preview with hero name:</label>
                            <input
                                type="text"
                                className="form-input"
                                value={previewName}
                                onChange={(e) => setPreviewName(e.target.value)}
                                placeholder="Enter a name to preview..."
                                style={{ maxWidth: '300px' }}
                            />
                        </div>
                        <div
                            style={{
                                padding: '2rem',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.8',
                                fontSize: '1.05rem'
                            }}
                        >
                            <h4 style={{ color: 'white', marginBottom: '1rem' }}>{story.title}</h4>
                            {replaceHeroName(story.content, previewName || '{HERO}')}
                        </div>
                    </div>
                )}
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

export default StoryEditor;

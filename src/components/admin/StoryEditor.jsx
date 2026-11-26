import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAllSubjects, addStory, getStoryById, updateStory, replaceHeroName } from '../../services/storyService';
import { generateStoryAudio } from '../../services/cloudTtsService';
import { uploadStoryFile } from '../../services/uploadService';
import NarrationField from './NarrationField';

function StoryEditor() {
    const { id } = useParams();
    const [subjects, setSubjects] = useState([]);
    const [story, setStory] = useState({
        title_en: '',
        title_ar: '',
        content_en: '',
        content_ar: '',
        subjectId: '',
        isFree: false,
        duration: 5,
        thumbnailUrl: '',
        illustrations: [],
        narrationUrl_en: '',
        narrationUrl_ar: '',
        title_ar_girl: '',
        content_ar_girl: '',
        narrationUrl_ar_girl: '',
        title_en_girl: '',
        content_en_girl: '',
        narrationUrl_en_girl: ''
    });
    const [uploading, setUploading] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingAudio, setGeneratingAudio] = useState({ en: false, ar: false });
    const [audioStatus, setAudioStatus] = useState({ en: '', ar: '' });
    const [storyId, setStoryId] = useState(id || null);
    const [previewName, setPreviewName] = useState('Alex');
    const [showPreview, setShowPreview] = useState(false);
    const [activeTab, setActiveTab] = useState('en'); // 'en' or 'ar'
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
                    subjectId: storyData.subjectId || '',
                    isFree: storyData.isFree === true,
                    duration: storyData.duration || 5,
                    thumbnailUrl: storyData.thumbnailUrl || '',
                    illustrations: storyData.illustrations || [],
                    narrationUrl_en: storyData.narrationUrl_en || '',
                    narrationUrl_ar: storyData.narrationUrl_ar || '',
                    title_ar_girl: storyData.title_ar_girl || '',
                    content_ar_girl: storyData.content_ar_girl || '',
                    narrationUrl_ar_girl: storyData.narrationUrl_ar_girl || '',
                    title_en_girl: storyData.title_en_girl || '',
                    content_en_girl: storyData.content_en_girl || '',
                    narrationUrl_en_girl: storyData.narrationUrl_en_girl || ''
                });
            }
        }

        setLoading(false);
    };

    const handleUpload = async (files, field) => {
        if (!files || files.length === 0) return;
        setUploading(field);
        try {
            if (field === 'illustrations') {
                const urls = [];
                for (const file of Array.from(files)) {
                    urls.push(await uploadStoryFile(file, 'images'));
                }
                setStory((prev) => ({ ...prev, illustrations: [...(prev.illustrations || []), ...urls] }));
            } else {
                const kind = field.startsWith('narration') ? 'narration' : 'images';
                const url = await uploadStoryFile(files[0], kind);
                setStory((prev) => ({ ...prev, [field]: url }));
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading('');
        }
    };

    const moveIllustration = (index, direction) => {
        setStory((prev) => {
            const list = [...prev.illustrations];
            const target = index + direction;
            if (target < 0 || target >= list.length) return prev;
            [list[index], list[target]] = [list[target], list[index]];
            return { ...prev, illustrations: list };
        });
    };

    const removeIllustration = (index) => {
        setStory((prev) => ({ ...prev, illustrations: prev.illustrations.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

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
            let savedId;
            if (isEditing) {
                await updateStory(id, story);
                savedId = id;
            } else {
                const result = await addStory(story);
                savedId = result.id;
            }
            setStoryId(savedId);
            alert('✅ Story saved! You can now generate audio below.');
        } catch (error) {
            alert('Error saving story: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateAudio = async (language) => {
        const currentStoryId = storyId || id;
        if (!currentStoryId) {
            alert('Please save the story first before generating audio.');
            return;
        }

        const text = language === 'ar' ? story.content_ar : story.content_en;
        if (!text || text.trim().length < 10) {
            alert(`No ${language === 'ar' ? 'Arabic' : 'English'} content to generate audio for.`);
            return;
        }

        // Remove placeholders for audio (use a generic name)
        const cleanText = text.replace(/{HERO}/g, 'Hero').replace(/{بطل}/g, 'بطل');

        setGeneratingAudio(prev => ({ ...prev, [language]: true }));
        setAudioStatus(prev => ({ ...prev, [language]: '⏳ Generating audio...' }));

        try {
            const result = await generateStoryAudio(currentStoryId, cleanText, language);
            setAudioStatus(prev => ({ ...prev, [language]: `✅ Audio ready!` }));
            console.log('Audio URL:', result.audioUrl);
        } catch (error) {
            console.error('Audio generation error:', error);
            setAudioStatus(prev => ({ ...prev, [language]: `❌ Failed: ${error.message}` }));
        } finally {
            setGeneratingAudio(prev => ({ ...prev, [language]: false }));
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
                            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer', fontSize: '1.1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={!!story.isFree}
                                    onChange={(e) => setStory({ ...story, isFree: e.target.checked })}
                                    style={{ width: '1.3rem', height: '1.3rem' }}
                                />
                                🔓 Free story (open to everyone)
                            </label>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>
                                Stories that are not free show as "Coming soon" with an email sign-up.
                                Until you tick at least one story, all stories stay open.
                            </p>
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


                        {/* Pictures for the printable book */}
                        <div className="form-group">
                            <label className="form-label">Cover image (optional, for the printable book)</label>
                            {story.thumbnailUrl && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <img src={story.thumbnailUrl} alt="Cover" style={{ maxWidth: '200px', borderRadius: '8px', display: 'block' }} />
                                    <button type="button" className="btn" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                                        onClick={() => setStory({ ...story, thumbnailUrl: '' })}>Remove cover</button>
                                </div>
                            )}
                            <input type="file" accept="image/*" disabled={!!uploading}
                                onChange={(e) => handleUpload(e.target.files, 'thumbnailUrl')} />
                            {uploading === 'thumbnailUrl' && <p style={{ opacity: 0.7 }}>Uploading…</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Illustrations (optional, for the printable book, in page order)</label>
                            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                                The story text is shared out evenly across these pictures, one picture per page.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                {(story.illustrations || []).map((url, index) => (
                                    <div key={url} style={{ width: '120px', textAlign: 'center' }}>
                                        <img src={url} alt={`Page ${index + 1}`} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px' }} />
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Page {index + 1}</div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                            <button type="button" onClick={() => moveIllustration(index, -1)} aria-label="Move earlier">◀</button>
                                            <button type="button" onClick={() => moveIllustration(index, 1)} aria-label="Move later">▶</button>
                                            <button type="button" onClick={() => removeIllustration(index)} aria-label="Remove">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <input type="file" accept="image/*" multiple disabled={!!uploading}
                                onChange={(e) => handleUpload(e.target.files, 'illustrations')} />
                            {uploading === 'illustrations' && <p style={{ opacity: 0.7 }}>Uploading…</p>}
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

                                <NarrationField
                                    label="🌙 Kessa voice — English"
                                    url={story.narrationUrl_en}
                                    onChange={(url) => setStory((prev) => ({ ...prev, narrationUrl_en: url }))}
                                    nameHint="“our little hero”"
                                />

                                <div className="form-group" style={{ marginTop: '2rem' }}>
                                    <label className="form-label">👧 Girl version — title (optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={story.title_en_girl}
                                        onChange={(e) => setStory({ ...story, title_en_girl: e.target.value })}
                                        placeholder="Leave empty to use the same title"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">👧 Girl version — story</label>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: '0.5rem' }}>
                                        The same story for girls (for example, her friends are girls). Leave empty and girls hear the version above.
                                    </p>
                                    <textarea
                                        className="form-textarea"
                                        value={story.content_en_girl}
                                        onChange={(e) => setStory({ ...story, content_en_girl: e.target.value })}
                                        rows="15"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem' }}>
                                        Word count: {story.content_en_girl.split(/\s+/).filter(w => w).length}
                                    </p>
                                </div>

                                <NarrationField
                                    label="🌙 Kessa voice — English, girl version"
                                    url={story.narrationUrl_en_girl}
                                    onChange={(url) => setStory((prev) => ({ ...prev, narrationUrl_en_girl: url }))}
                                    nameHint="“our little hero”"
                                />
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

                                <NarrationField
                                    label="🌙 Kessa voice — Arabic, boy version / صوت قصة — نسخة الولد"
                                    url={story.narrationUrl_ar}
                                    onChange={(url) => setStory((prev) => ({ ...prev, narrationUrl_ar: url }))}
                                    nameHint="«بطلنا الصغير»"
                                    dir="rtl"
                                />

                                <div className="form-group" style={{ marginTop: '2rem' }}>
                                    <label className="form-label">👧 Girl version — title / عنوان نسخة البنت</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={story.title_ar_girl}
                                        onChange={(e) => setStory({ ...story, title_ar_girl: e.target.value })}
                                        placeholder="اتركيه فارغًا لاستخدام العنوان نفسه"
                                        style={{ direction: 'rtl', fontFamily: 'var(--font-body)' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">👧 Girl version — story / نص القصة للبنت</label>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: '0.5rem', direction: 'rtl' }}>
                                        القصة نفسها بصيغة المؤنث (كانت {'{بطل}'} تحبّ…). إن تُركت فارغة، تُقرأ نسخة الولد للبنات أيضًا.
                                    </p>
                                    <textarea
                                        className="form-textarea"
                                        value={story.content_ar_girl}
                                        onChange={(e) => setStory({ ...story, content_ar_girl: e.target.value })}
                                        rows="15"
                                        style={{ direction: 'rtl', fontFamily: 'var(--font-body)' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem', direction: 'rtl' }}>
                                        عدد الكلمات: {story.content_ar_girl.split(/\s+/).filter(w => w).length}
                                    </p>
                                </div>

                                <NarrationField
                                    label="🌙 Kessa voice — Arabic, girl version / صوت قصة — نسخة البنت"
                                    url={story.narrationUrl_ar_girl}
                                    onChange={(url) => setStory((prev) => ({ ...prev, narrationUrl_ar_girl: url }))}
                                    nameHint="«بطلتنا الصغيرة»"
                                    dir="rtl"
                                />
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving || !!uploading}>
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

                        {/* ── Generate Audio Section ── */}
                        {(storyId || id) && (
                            <div style={{
                                marginTop: '2rem',
                                padding: '1.5rem',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <h3 style={{ color: 'white', marginBottom: '1rem' }}>🎤 Generate Voice Audio</h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                                    Generate high-quality Google Cloud TTS audio. This creates an MP3 file stored in Firebase Storage.
                                </p>

                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {story.content_en && (
                                        <div>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => handleGenerateAudio('en')}
                                                disabled={generatingAudio.en}
                                                style={{ minWidth: '200px' }}
                                            >
                                                {generatingAudio.en ? '⏳ Generating...' : '🇬🇧 Generate English Audio'}
                                            </button>
                                            {audioStatus.en && (
                                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{audioStatus.en}</p>
                                            )}
                                        </div>
                                    )}
                                    {story.content_ar && (
                                        <div>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => handleGenerateAudio('ar')}
                                                disabled={generatingAudio.ar}
                                                style={{ minWidth: '200px' }}
                                            >
                                                {generatingAudio.ar ? '⏳ Generating...' : '🇸🇦 Generate Arabic Audio'}
                                            </button>
                                            {audioStatus.ar && (
                                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', direction: 'rtl' }}>{audioStatus.ar}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
                            dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
                            style={{
                                padding: '2rem',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.8',
                                fontSize: '1.05rem'
                            }}
                        >
                            <h4 style={{ color: 'white', marginBottom: '1rem' }}>
                                {activeTab === 'ar' ? story.title_ar : story.title_en}
                            </h4>
                            {replaceHeroName(
                                activeTab === 'ar' ? story.content_ar : story.content_en,
                                previewName || (activeTab === 'ar' ? '{بطل}' : '{HERO}')
                            )}
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

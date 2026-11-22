import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getStoriesForListing,
    hasFreeStoriesConfigured,
    isStoryOpen,
    getStoryTitle,
    replaceHeroName,
    joinWaitlist
} from '../services/storyService';

/** Email box: "tell me when new stories arrive" */
export function WaitlistForm({ language }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle | sending | done | error
    const isArabic = language === 'ar';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await joinWaitlist(email, language);
            setStatus('done');
        } catch {
            setStatus('error');
        }
    };

    if (status === 'done') {
        return (
            <p style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                {isArabic ? '🌙 شكرًا! سنخبرك عندما تصل القصص الجديدة.' : '🌙 Thank you! We will tell you when new stories arrive.'}
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit} dir={isArabic ? 'rtl' : 'ltr'}>
            <h3 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
                {isArabic ? '✨ قصص جديدة قريبًا' : '✨ More stories coming soon'}
            </h3>
            <p style={{ textAlign: 'center', opacity: 0.85, marginBottom: '1rem' }}>
                {isArabic ? 'اتركي بريدك الإلكتروني وسنخبرك أولًا.' : 'Leave your email and you will be the first to know.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                    type="email"
                    required
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isArabic ? 'بريدك الإلكتروني' : 'Your email'}
                    style={{ flex: '1 1 220px', maxWidth: '320px' }}
                />
                <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
                    {isArabic ? 'أخبروني' : 'Notify me'}
                </button>
            </div>
            {status === 'error' && (
                <p style={{ color: 'var(--error)', textAlign: 'center', marginTop: '0.5rem' }}>
                    {isArabic ? 'تأكدي من البريد الإلكتروني وحاولي مرة أخرى.' : 'Please check the email and try again.'}
                </p>
            )}
        </form>
    );
}

function StoryList({ childName }) {
    const [stories, setStories] = useState([]);
    const [freeConfigured, setFreeConfigured] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showWaitlist, setShowWaitlist] = useState(false);
    const navigate = useNavigate();
    const language = localStorage.getItem('language') || 'en';
    const isArabic = language === 'ar';

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }
        Promise.all([getStoriesForListing(), hasFreeStoriesConfigured()]).then(([all, configured]) => {
            // Only stories that have text in the chosen language
            const inLanguage = all.filter((story) => (isArabic
                ? story.content_ar?.trim()
                : (story.content_en?.trim() || story.content?.trim())));
            setStories(inLanguage);
            setFreeConfigured(configured);
            setLoading(false);
        });
    }, [childName, navigate, isArabic]);

    const openStory = (story) => {
        if (isStoryOpen(story, freeConfigured)) {
            navigate(`/play/${story.id}`);
        } else {
            setShowWaitlist(true);
            setTimeout(() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
            </div>
        );
    }

    return (
        <div className="page" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                    <h1 className="page-title">
                        {isArabic ? `🌙 قصص ${childName}` : `🌙 ${childName}'s stories`}
                    </h1>
                    <p className="page-subtitle">
                        {isArabic ? 'اختر قصة قبل النوم' : 'Choose a bedtime story'}
                    </p>
                </div>

                {stories.length === 0 ? (
                    <div className="glass-card text-center">
                        <h3>{isArabic ? '📝 لا توجد قصص بعد' : '📝 No stories yet'}</h3>
                    </div>
                ) : (
                    <div className="card-grid">
                        {stories.map((story) => {
                            const open = isStoryOpen(story, freeConfigured);
                            return (
                                <div
                                    key={story.id}
                                    className="story-card"
                                    onClick={() => openStory(story)}
                                    style={{ opacity: open ? 1 : 0.6 }}
                                >
                                    <h3 className="story-card-title">
                                        {replaceHeroName(getStoryTitle(story, language), childName) || (isArabic ? 'قصة' : 'Story')}
                                    </h3>
                                    {story.duration && (
                                        <p className="story-card-desc">
                                            ⏱️ {isArabic ? `حوالي ${story.duration} دقائق` : `About ${story.duration} minutes`}
                                        </p>
                                    )}
                                    <div style={{ marginTop: '1rem' }}>
                                        <span style={{
                                            background: open ? 'var(--primary-purple)' : 'rgba(255, 255, 255, 0.15)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.9rem',
                                            display: 'inline-block'
                                        }}>
                                            {open
                                                ? (isArabic ? 'استمع الآن 🎧' : 'Listen now 🎧')
                                                : (isArabic ? '🔒 قريبًا' : '🔒 Coming soon')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div id="waitlist" className="glass-card" style={{ marginTop: '2.5rem', outline: showWaitlist ? '2px solid var(--primary-purple)' : 'none' }}>
                    <WaitlistForm language={language} />
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/')}>
                        {isArabic ? 'تغيير الاسم' : 'Change name'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StoryList;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRModal from './QRModal';

// v4 — share/QR section moved above the form for visibility
function WelcomePage({ onNameSubmit }) {
    const [childName, setChildName] = useState('');
    const [error, setError] = useState('');
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
    const [showQR, setShowQR] = useState(false);
    const [shareToast, setShareToast] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!childName.trim()) {
            setError(language === 'ar' ? 'الرجاء إدخال اسم!' : 'Please enter a name!');
            return;
        }

        if (childName.trim().length < 2) {
            setError(language === 'ar' ? 'يجب أن يكون الاسم حرفين على الأقل' : 'Name should be at least 2 characters');
            return;
        }

        localStorage.setItem('language', language);
        onNameSubmit(childName.trim());
        navigate('/subjects');
    };

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    };

    const handleShareApp = async (platform) => {
        const appUrl = window.location.origin;
        const isAr = language === 'ar';
        const shareText = isAr
            ? `✨ حكايات ماما — قصص سحرية حيث طفلك هو البطل! 🌙\n${appUrl}`
            : `✨ Mama's Tales — magical bedtime stories where YOUR child is the hero! 🌙\n${appUrl}`;
        const emoji = platform === 'instagram' ? '📸' : '🎵';
        const label = platform === 'instagram' ? 'Instagram' : 'TikTok';

        if (navigator.share) {
            try {
                await navigator.share({ title: isAr ? 'حكايات ماما' : "Mama's Tales", text: shareText, url: appUrl });
            } catch (_) { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                setShareToast(`${emoji} Link copied! Share on ${label} 🎉`);
            } catch {
                setShareToast(`${emoji} Share on ${label}!`);
            }
            setTimeout(() => setShareToast(null), 2800);
        }
    };

    return (
        <div className="page">


            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                {/* Language Selector */}
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    zIndex: 100
                }}>
                    <button
                        type="button"
                        onClick={() => handleLanguageChange('en')}
                        className={language === 'en' ? 'btn btn-primary' : 'btn'}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                        English
                    </button>
                    <button
                        type="button"
                        onClick={() => handleLanguageChange('ar')}
                        className={language === 'ar' ? 'btn btn-primary' : 'btn'}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                        عربي
                    </button>
                </div>

                <div className="page-header">
                    <h1 className="page-title float-animation">
                        ✨ {language === 'ar' ? 'حكايات ماما' : 'Mama\'s Tales'} ✨
                    </h1>
                    <p className="page-subtitle">
                        {language === 'ar'
                            ? 'قصص سحرية حيث أنت البطل!'
                            : 'Magical stories where YOU are the hero!'}
                    </p>
                </div>

                {/* ── Share & QR — placed HERE above the form ── */}
                <div style={{
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '16px',
                    padding: '1rem',
                    maxWidth: '500px',
                    margin: '0 auto 1.5rem auto'
                }}>
                    <p style={{
                        fontSize: '0.95rem',
                        opacity: 0.9,
                        marginBottom: '0.75rem',
                        fontWeight: '600'
                    }}>
                        {language === 'ar' ? '📲 شارك التطبيق مع أصدقائك!' : '📲 Share with friends!'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                            className="share-btn share-btn-instagram"
                            onClick={() => handleShareApp('instagram')}
                            title="Share on Instagram"
                        >
                            📸 Instagram
                        </button>
                        <button
                            className="share-btn share-btn-tiktok"
                            onClick={() => handleShareApp('tiktok')}
                            title="Share on TikTok"
                        >
                            🎵 TikTok
                        </button>
                        <button
                            className="share-btn share-btn-qr"
                            onClick={() => setShowQR(true)}
                            title="Show QR Code"
                        >
                            📷 QR Code
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '1.2rem', textAlign: 'center', display: 'block' }}>
                                {language === 'ar'
                                    ? '🌟 ما اسمك أيها البطل الصغير؟'
                                    : '🌟 What\'s your name, little hero?'}
                            </label>
                            <input
                                type="text"
                                className="input"
                                placeholder={language === 'ar' ? 'أدخل اسمك...' : 'Enter your name...'}
                                value={childName}
                                onChange={(e) => {
                                    setChildName(e.target.value);
                                    setError('');
                                }}
                                style={{
                                    marginTop: '1rem',
                                    fontSize: '1.5rem',
                                    textAlign: 'center',
                                    padding: '1.5rem',
                                    direction: language === 'ar' ? 'rtl' : 'ltr'
                                }}
                                autoFocus
                            />
                            {error && (
                                <p style={{ color: 'var(--error)', marginTop: '0.5rem', textAlign: 'center' }}>
                                    {error}
                                </p>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', marginTop: '1rem' }}>
                            {language === 'ar' ? 'ابدأ مغامرتي! 🚀' : 'Start My Adventure! 🚀'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.8 }}>
                        <p style={{ fontSize: '0.9rem' }}>
                            {language === 'ar'
                                ? '✨ سنستخدم اسمك لتصبح بطل كل قصة!'
                                : '✨ We\'ll use your name to make you the hero of every story!'}
                        </p>
                    </div>
                </div>

                {/* Admin Link */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <a
                        href="/admin/login"
                        style={{
                            color: 'rgba(255, 255, 255, 0.4)',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                        }}
                    >
                        {language === 'ar' ? 'تسجيل دخول المسؤول' : 'Admin Login'}
                    </a>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', margin: '0 0.75rem' }}>•</span>
                    <a href="/privacy" style={{ color: 'rgba(255, 255, 255, 0.5)', textDecoration: 'none', fontSize: '0.85rem' }}>
                        {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                    </a>
                </div>
            </div>

            {/* Share Toast */}
            {shareToast && (
                <div className="share-toast">
                    {shareToast}
                </div>
            )}

            {/* QR Modal */}
            {showQR && (
                <QRModal
                    storyTitle={language === 'ar' ? 'حكايات ماما' : "Mama's Tales"}
                    storyUrl={window.location.origin}
                    onClose={() => setShowQR(false)}
                />
            )}
        </div>
    );
}

export default WelcomePage;

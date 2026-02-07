import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function WelcomePage({ onNameSubmit }) {
    const [childName, setChildName] = useState('');
    const [error, setError] = useState('');
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
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

    return (
        <div className="page">
            {/* Background Stars */}
            <div className="stars">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            left: `${Math.random() * 100}% `,
                            top: `${Math.random() * 100}% `,
                            animationDelay: `${Math.random() * 3} s`
                        }}
                    />
                ))}
            </div>

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
                        style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            background: language === 'en' ? undefined : 'rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        English
                    </button>
                    <button
                        type="button"
                        onClick={() => handleLanguageChange('ar')}
                        className={language === 'ar' ? 'btn btn-primary' : 'btn'}
                        style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            background: language === 'ar' ? undefined : 'rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        عربي
                    </button>
                </div>

                <div className="page-header">
                    <h1 className="page-title float-animation">
                        ✨ {language === 'ar' ? 'قصة' : 'Kissa'} ✨
                    </h1>
                    <p className="page-subtitle">
                        {language === 'ar'
                            ? 'قصص سحرية حيث أنت البطل!'
                            : 'Magical stories where YOU are the hero!'}
                    </p>
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
                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <a
                        href="/admin/login"
                        style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}
                        onMouseOut={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.5)'}
                    >
                        {language === 'ar' ? 'تسجيل دخول المسؤول' : 'Admin Login'}
                    </a>
                </div>
            </div>
        </div>
    );
}

export default WelcomePage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubjects } from '../services/storyService';

function SubjectSelector({ childName }) {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
    const navigate = useNavigate();

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }

        loadSubjects();
    }, [childName, navigate]);

    const loadSubjects = async () => {
        setLoading(true);
        const data = await getAllSubjects();
        setSubjects(data);
        setLoading(false);
    };

    const handleSubjectClick = (subjectId) => {
        navigate(`/stories/${subjectId}`);
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
        <div className="page">


            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                    <h1 className="page-title">
                        {language === 'ar' ? `أهلاً يا ${childName}! 👋` : `Hello, ${childName}! 👋`}
                    </h1>
                    <p className="page-subtitle">
                        {language === 'ar' ? 'اختر نوع المغامرة التي تريدها اليوم' : 'Choose what kind of adventure you want today'}
                    </p>
                </div>

                {subjects.length === 0 ? (
                    <div className="glass-card text-center">
                        <h3 style={{ marginBottom: '1rem' }}>
                            {language === 'ar' ? '📚 لا توجد قصص بعد!' : '📚 No Stories Yet!'}
                        </h3>
                        <p>
                            {language === 'ar'
                                ? 'اطلب من المسؤول إضافة بعض مواضيع القصص المثيرة!'
                                : 'Ask an admin to add some exciting story subjects!'}
                        </p>
                        <button
                            className="btn btn-primary mt-3"
                            onClick={() => navigate('/')}
                        >
                            {language === 'ar' ? 'العودة' : 'Go Back'}
                        </button>
                    </div>
                ) : (
                    <div className="card-grid">
                        {subjects.map((subject) => (
                            <div
                                key={subject.id}
                                className="story-card"
                                onClick={() => handleSubjectClick(subject.id)}
                            >
                                <span className="story-card-icon">{subject.icon || '📖'}</span>
                                <h3 className="story-card-title">{subject.name}</h3>
                                <p className="story-card-desc">{subject.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/')}
                    >
                        {language === 'ar' ? '← تغيير الاسم' : '← Change Name'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SubjectSelector;

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getStoryById,
    getStoryTitle,
    getStoryContent,
    getContentLanguage,
    replaceHeroName,
    hasFreeStoriesConfigured,
    isStoryOpen
} from '../services/storyService';
import { cleanStoryText } from '../utils/textCleaner';
import { saveRecording, getRecording, deleteRecording, pickMimeType } from '../services/recordingStore';

const MAX_SECONDS = 20 * 60;

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/**
 * Parent reads the story aloud; the recording is kept on this device and played to the child.
 */
function RecordStory({ childName }) {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const uiLanguage = localStorage.getItem('language') || 'en';
    const isArabicUi = uiLanguage === 'ar';
    const t = (en, ar) => (isArabicUi ? ar : en);

    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState('ready'); // ready | recording | review
    const [seconds, setSeconds] = useState(0);
    const [draftUrl, setDraftUrl] = useState('');
    const [hasSaved, setHasSaved] = useState(false);
    const [message, setMessage] = useState('');

    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const blobRef = useRef(null);
    const timerRef = useRef(null);
    const languageRef = useRef('en');

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }
        (async () => {
            const [data, freeConfigured] = await Promise.all([getStoryById(storyId), hasFreeStoriesConfigured()]);
            if (!data || !isStoryOpen(data, freeConfigured)) {
                navigate('/stories');
                return;
            }
            languageRef.current = getContentLanguage(data, uiLanguage);
            setStory(data);
            setHasSaved(!!(await getRecording(storyId, languageRef.current)));
            setLoading(false);
        })();
        return () => stopEverything();
    }, [storyId, childName]);

    const stopEverything = () => {
        clearInterval(timerRef.current);
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        streamRef.current?.getTracks().forEach((track) => track.stop());
    };

    const startRecording = async () => {
        setMessage('');
        const mimeType = pickMimeType();
        if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
            setMessage(t('Recording is not supported in this browser. Please try Chrome or Safari.',
                'التسجيل غير مدعوم في هذا المتصفح. جرّبي Chrome أو Safari.'));
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
                blobRef.current = blob;
                if (draftUrl) URL.revokeObjectURL(draftUrl);
                setDraftUrl(URL.createObjectURL(blob));
                setPhase('review');
            };
            recorderRef.current = recorder;
            recorder.start(1000);
            setSeconds(0);
            setPhase('recording');
            timerRef.current = setInterval(() => {
                setSeconds((s) => {
                    if (s + 1 >= MAX_SECONDS) stopRecording();
                    return s + 1;
                });
            }, 1000);
        } catch (error) {
            console.error('Microphone error:', error);
            setMessage(t('Please allow the microphone to record your voice.', 'اسمحي باستخدام الميكروفون لتسجيل صوتك.'));
        }
    };

    const stopRecording = () => {
        clearInterval(timerRef.current);
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };

    const handleSave = async () => {
        try {
            await saveRecording(storyId, languageRef.current, blobRef.current, childName);
            setHasSaved(true);
            navigate(`/play/${storyId}`);
        } catch (error) {
            console.error('Save failed:', error);
            setMessage(t('Could not save the recording on this device.', 'تعذّر حفظ التسجيل على هذا الجهاز.'));
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('Delete your saved recording?', 'حذف تسجيلك المحفوظ؟'))) return;
        await deleteRecording(storyId, languageRef.current);
        setHasSaved(false);
    };

    if (loading) {
        return <div className="page"><div className="loading"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div></div>;
    }

    const contentLanguage = languageRef.current;
    const title = replaceHeroName(getStoryTitle(story, contentLanguage), childName);
    const text = replaceHeroName(cleanStoryText(getStoryContent(story, contentLanguage)), childName);

    return (
        <div className="page">
            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
                <div className="glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }} dir={isArabicUi ? 'rtl' : 'ltr'}>
                    <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>🎙️ {title}</h2>
                    <p style={{ opacity: 0.85 }}>
                        {t(`Read the story aloud for ${childName}. Find a quiet place and hold the phone about a hand's width from your mouth.`,
                            `اقرئي القصة بصوتك لـ ${childName}. اختاري مكانًا هادئًا وأمسكي الهاتف على بُعد كفّ من فمك.`)}
                    </p>
                    <p style={{ opacity: 0.7, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        {t('Your recording stays on this device only.', 'يبقى تسجيلك على هذا الجهاز فقط.')}
                    </p>
                </div>

                {/* Controls */}
                <div className="glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {phase === 'ready' && (
                        <>
                            <button className="btn btn-primary btn-large" onClick={startRecording} style={{ fontSize: '1.3rem' }}>
                                {t('🔴 Start recording', '🔴 ابدئي التسجيل')}
                            </button>
                            {hasSaved && (
                                <div style={{ marginTop: '1rem' }}>
                                    <p style={{ opacity: 0.8, marginBottom: '0.5rem' }}>
                                        {t('You already have a saved recording for this story. Recording again will replace it.',
                                            'لديك تسجيل محفوظ لهذه القصة. التسجيل من جديد سيستبدله.')}
                                    </p>
                                    <button className="btn btn-secondary" onClick={handleDelete}>
                                        {t('🗑️ Delete saved recording', '🗑️ حذف التسجيل المحفوظ')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {phase === 'recording' && (
                        <>
                            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔴 {formatTime(seconds)}</p>
                            <button className="btn btn-primary btn-large" onClick={stopRecording} style={{ fontSize: '1.3rem' }}>
                                {t('⏹️ Finish', '⏹️ إنهاء')}
                            </button>
                        </>
                    )}

                    {phase === 'review' && (
                        <>
                            <p style={{ marginBottom: '0.75rem' }}>{t('Listen to your recording:', 'استمعي إلى تسجيلك:')}</p>
                            <audio controls src={draftUrl} style={{ width: '100%', marginBottom: '1rem' }} />
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={handleSave}>
                                    {t('💾 Save for my child', '💾 احفظي لطفلك')}
                                </button>
                                <button className="btn btn-secondary" onClick={() => setPhase('ready')}>
                                    {t('🔄 Record again', '🔄 سجّلي من جديد')}
                                </button>
                            </div>
                        </>
                    )}

                    {message && <p style={{ marginTop: '1rem', color: 'var(--error)' }}>{message}</p>}
                </div>

                {/* Story text to read */}
                <div className="glass-card" dir={contentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                    <div style={{ fontSize: '1.35rem', lineHeight: 2, maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem' }}>
                        {text.split('\n').map((paragraph, i) => paragraph.trim() && (
                            <p key={i} style={{ marginBottom: '1.2rem' }}>{paragraph}</p>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => { stopEverything(); navigate(`/play/${storyId}`); }}>
                        {t('← Back to the story', '→ العودة إلى القصة')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RecordStory;

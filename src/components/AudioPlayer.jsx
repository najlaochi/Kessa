import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStoryById, replaceHeroName, getStoryTitle, getStoryContent, getContentLanguage } from '../services/storyService';
import { getNarrationUrl } from '../services/narrationService';
import audioService from '../services/audioService';

const MUSIC_URL = '/music/calm-night.mp3';

function AudioPlayer({ childName }) {
    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [notice, setNotice] = useState('');
    const [progress, setProgress] = useState(0);
    const [musicVolume, setMusicVolume] = useState(0.3);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const { storyId } = useParams();
    const navigate = useNavigate();
    const storyTextRef = useRef('');
    const contentLangRef = useRef('en');

    // 'mp3' = natural voice file, 'browser' = the phone's built-in voice (fallback)
    const modeRef = useRef(null);
    const narrationRef = useRef(null);
    const musicRef = useRef(null);

    const uiLanguage = localStorage.getItem('language') || 'en';
    const t = (en, ar) => (uiLanguage === 'ar' ? ar : en);

    const fetchStory = async () => {
        setLoading(true);
        try {
            const storyData = await getStoryById(storyId);
            if (storyData) {
                setStory(storyData);
                contentLangRef.current = getContentLanguage(storyData, uiLanguage);
                const storyContent = getStoryContent(storyData, uiLanguage);
                if (!storyContent) {
                    console.error('No story content found for any language');
                    return;
                }
                storyTextRef.current = replaceHeroName(storyContent, childName);
            }
        } catch (error) {
            console.error('Error fetching story:', error);
        } finally {
            setLoading(false);
        }
    };

    const stopMp3 = () => {
        [narrationRef.current, musicRef.current].forEach((el) => {
            if (el) {
                el.pause();
                el.currentTime = 0;
            }
        });
        narrationRef.current = null;
        musicRef.current = null;
    };

    const stopEverything = () => {
        stopMp3();
        audioService.stop();
        modeRef.current = null;
    };

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }
        fetchStory();
        return () => stopEverything();
    }, [storyId, childName, navigate]);

    const resetState = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
    };

    /** Play an MP3 narration with the background music underneath. */
    const playMp3 = async (url, music) => {
        const narration = new Audio(url);
        narration.preload = 'auto';
        narration.playbackRate = playbackSpeed;
        narration.addEventListener('timeupdate', () => {
            if (narration.duration) setProgress((narration.currentTime / narration.duration) * 100);
        });
        narration.addEventListener('ended', () => {
            stopMp3();
            modeRef.current = null;
            resetState();
        });
        narrationRef.current = narration;
        musicRef.current = music;
        modeRef.current = 'mp3';

        try {
            await narration.play();
        } catch (error) {
            // Some phones block sound that starts after a wait: ask for one more tap
            if (error.name === 'NotAllowedError') {
                music.pause();
                setIsPaused(true);
                setIsPlaying(false);
                setNotice(t('Ready! Tap Resume to listen.', 'جاهزة! اضغط "متابعة" للاستماع.'));
                return;
            }
            throw error;
        }
        setIsPlaying(true);
        setIsPaused(false);
    };

    /** The old way: the phone's own voice. Used only if the natural voice is not available. */
    const playWithBrowserVoice = () => {
        audioService.onProgress((charIndex, total) => {
            setProgress(Math.min((charIndex / total) * 100, 100));
        });
        audioService.onEnd(() => {
            modeRef.current = null;
            resetState();
        });

        const language = contentLangRef.current;
        const isAndroid = /Android/.test(navigator.userAgent);
        const voiceSettings = language === 'ar'
            ? { rate: isAndroid ? 0.90 : 0.83, pitch: 1.08, volume: 1.0, musicVolume, language }
            : { rate: isAndroid ? 0.85 : 0.78, pitch: 1.10, volume: 1.0, musicVolume, language };

        modeRef.current = 'browser';
        audioService.setSpeed(playbackSpeed);
        audioService.narrateExpressive(storyTextRef.current, MUSIC_URL, voiceSettings);
        setIsPlaying(true);
        setIsPaused(false);
    };

    const handlePlay = async () => {
        setNotice('');

        if (isPaused) {
            if (modeRef.current === 'mp3') {
                narrationRef.current?.play();
                musicRef.current?.play().catch(() => {});
            } else {
                audioService.resume();
            }
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        // Start the music straight away, inside the tap, so phones allow the sound
        const music = new Audio(MUSIC_URL);
        music.loop = true;
        music.volume = musicVolume;
        music.play().catch(() => {});

        const language = contentLangRef.current;
        const ownRecording = story?.[`narrationUrl_${language}`];

        setPreparing(true);
        try {
            const url = ownRecording || await getNarrationUrl(storyId, childName, language);
            await playMp3(url, music);
        } catch (error) {
            console.warn('Natural voice not available, using the device voice:', error);
            music.pause();
            setNotice(t(
                'The natural voice is not available right now, so the phone voice is used.',
                'الصوت الطبيعي غير متاح الآن، لذلك نستخدم صوت الهاتف.'
            ));
            playWithBrowserVoice();
        } finally {
            setPreparing(false);
        }
    };

    const handlePause = () => {
        if (modeRef.current === 'mp3') {
            narrationRef.current?.pause();
            musicRef.current?.pause();
        } else {
            audioService.pause();
        }
        setIsPaused(true);
        setIsPlaying(false);
    };

    const handleStop = () => {
        stopEverything();
        resetState();
    };

    const handleMusicVolumeChange = (e) => {
        const volume = parseFloat(e.target.value);
        setMusicVolume(volume);
        if (musicRef.current) musicRef.current.volume = volume;
        audioService.setMusicVolume(volume);
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        if (narrationRef.current) narrationRef.current.playbackRate = speed;
        if (modeRef.current === 'browser') audioService.setSpeed(speed);
    };

    const handleProgressBarClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const narration = narrationRef.current;
        if (modeRef.current === 'mp3' && narration?.duration) {
            narration.currentTime = (percentage / 100) * narration.duration;
            setProgress(percentage);
        } else if (modeRef.current === 'browser') {
            audioService.seekToProgress(percentage);
        }
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

    if (!story) {
        return (
            <div className="page">
                <div className="glass-card text-center">
                    <h3>Story not found!</h3>
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
                {[...Array(120)].map((_, i) => (
                    <div
                        key={i}
                        className="star"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`
                        }}
                    />
                ))}
            </div>

            {/* Moon */}
            <div className="moon"></div>

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
                {/* Story Header */}
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        {story.thumbnailUrl && (
                            <img
                                src={story.thumbnailUrl}
                                alt={getStoryTitle(story, contentLangRef.current)}
                                style={{
                                    width: '100%',
                                    maxHeight: '300px',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--radius-lg)',
                                    marginBottom: '1.5rem'
                                }}
                            />
                        )}
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'white' }}>
                            {replaceHeroName(getStoryTitle(story, contentLangRef.current), childName)}
                        </h2>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
                            {t('Starring:', 'البطل:')} <strong>{childName}</strong> ⭐
                        </p>
                    </div>
                </div>

                {/* Audio Player Controls */}
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    {/* Progress Bar */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div
                            onClick={handleProgressBarClick}
                            style={{
                                width: '100%',
                                height: '8px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--primary-purple), var(--secondary-pink))',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                            {Math.round(progress)}% • {t('Tap the bar to jump', 'اضغط على الشريط للتنقل')}
                        </p>
                    </div>

                    {/* Playback Controls */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        {!isPlaying && !isPaused && (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handlePlay}
                                disabled={preparing}
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem' }}
                            >
                                {preparing ? t('🎙️ Preparing the story…', '🎙️ نجهّز القصة…') : t('▶️ Play Story', '▶️ شغّل القصة')}
                            </button>
                        )}

                        {isPlaying && (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handlePause}
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem' }}
                            >
                                {t('⏸️ Pause', '⏸️ إيقاف مؤقت')}
                            </button>
                        )}

                        {isPaused && (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handlePlay}
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem' }}
                            >
                                {t('▶️ Resume', '▶️ متابعة')}
                            </button>
                        )}

                        {(isPlaying || isPaused) && (
                            <button
                                className="btn btn-secondary"
                                onClick={handleStop}
                                style={{ fontSize: '1.2rem', padding: '1.5rem 2rem' }}
                            >
                                {t('⏹️ Stop', '⏹️ إيقاف')}
                            </button>
                        )}
                    </div>

                    {notice && (
                        <p style={{ textAlign: 'center', marginBottom: '1.5rem', opacity: 0.85 }}>{notice}</p>
                    )}

                    {/* Speed Control */}
                    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', textAlign: 'center', fontSize: '1.1rem' }}>
                            ⚡ Playback Speed
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => handleSpeedChange(speed)}
                                    className="btn"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.9rem',
                                        background: playbackSpeed === speed
                                            ? 'linear-gradient(135deg, var(--primary-purple), var(--secondary-pink))'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        border: playbackSpeed === speed ? '2px solid var(--primary-purple)' : '1px solid var(--glass-border)',
                                        fontWeight: playbackSpeed === speed ? 'bold' : 'normal'
                                    }}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Music Volume Control */}
                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', textAlign: 'center', fontSize: '1.1rem' }}>
                            🎵 Background Music Volume
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span>🔇</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={musicVolume}
                                onChange={handleMusicVolumeChange}
                                style={{ flex: 1, cursor: 'pointer' }}
                            />
                            <span>🔊</span>
                        </div>
                        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }}>
                            {Math.round(musicVolume * 100)}%
                        </p>
                    </div>

                    {/* Calming Animation */}
                    {isPlaying && (
                        <div style={{
                            marginTop: '2rem',
                            textAlign: 'center',
                            fontSize: '3rem',
                            animation: 'float 3s ease-in-out infinite'
                        }}>
                            🌙
                        </div>
                    )}
                </div>

                {/* Story Text Preview */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Story Preview</h3>
                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        padding: '1rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        lineHeight: '1.8',
                        fontSize: '1.05rem'
                    }}>
                        {storyTextRef.current.split('\n').map((paragraph, idx) => (
                            paragraph.trim() && <p key={idx} style={{ marginBottom: '1rem' }}>{paragraph}</p>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div style={{ marginTop: '3rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            stopEverything();
                            navigate(`/print/${storyId}`);
                        }}
                    >
                        {t('🖨️ Printable book', '🖨️ كتاب للطباعة')}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            stopEverything();
                            navigate(-1);
                        }}
                    >
                        {t('← Back to Stories', '→ العودة للقصص')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AudioPlayer;

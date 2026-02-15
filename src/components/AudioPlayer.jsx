import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStoryById, replaceHeroName } from '../services/storyService';
import audioService from '../services/audioService';

function AudioPlayer({ childName }) {
    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [musicVolume, setMusicVolume] = useState(0.3);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.25);
    const { storyId } = useParams();
    const navigate = useNavigate();
    const storyTextRef = useRef('');

    const fetchStory = async () => {
        setLoading(true);
        try {
            const storyData = await getStoryById(storyId);
            if (storyData) {
                setStory(storyData);

                // Get user's language preference
                const language = localStorage.getItem('language') || 'en';

                // Get appropriate language content with backward compatibility
                let storyContent;

                if (language === 'ar') {
                    // For Arabic: try content_ar, then fallback to content_en, then old content field
                    storyContent = storyData.content_ar || storyData.content_en || storyData.content || '';
                } else {
                    // For English: try content_en, then fallback to old content field
                    storyContent = storyData.content_en || storyData.content || '';
                }

                if (!storyContent) {
                    console.error('No story content found for any language');
                    setLoading(false);
                    return;
                }

                console.log('Story content loaded:', storyContent.substring(0, 100) + '...');

                // Replace hero placeholder with child's name
                storyTextRef.current = replaceHeroName(storyContent, childName);
            }
        } catch (error) {
            console.error('Error fetching story:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!childName) {
            navigate('/');
            return;
        }

        fetchStory();

        // Cleanup on unmount
        return () => {
            audioService.stop();
        };
    }, [storyId, childName, navigate]);

    const handlePlay = () => {
        if (isPaused) {
            audioService.resume();
            setIsPaused(false);
            setIsPlaying(true);
        } else {
            // Start fresh narration
            audioService.onProgress((charIndex, total) => {
                const calculatedProgress = (charIndex / total) * 100;
                setProgress(Math.min(calculatedProgress, 100)); // Cap at 100%
            });

            audioService.onEnd(() => {
                setIsPlaying(false);
                setIsPaused(false);
                setProgress(0);
            });

            // Use the calm music from public folder
            const musicUrl = '/music/backgroundmusicforvideos-sleeping-music-calm-healing-relaxation-background-intro-theme-304096 (1).mp3';
            const language = localStorage.getItem('language') || 'en';

            // Detect mobile device type
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);

            // iOS Safari has very limited Web Speech API support
            if (isIOS) {
                alert(language === 'ar'
                    ? 'تنبيه: متصفح Safari لديه دعم محدود للصوت. للحصول على أفضل تجربة، استخدم Chrome أو قم بتثبيت التطبيق.'
                    : 'Note: Safari has limited voice support. For best experience, use Chrome browser or install the app.');
            }

            // Language-specific voice tuning - warm, human-like lady voices
            let voiceSettings;
            if (language === 'ar') {
                // Arabic: Warm, natural, human-like female voice
                voiceSettings = {
                    rate: isAndroid ? 0.90 : 0.83,   // Slower, warmer pace for storytelling
                    pitch: 1.08,  // Slightly higher pitch for warmer female voice
                    volume: 1.0,
                    musicVolume: musicVolume,
                    language: language
                };
            } else {
                // English: Warm, natural, human-like lady voice
                voiceSettings = {
                    rate: isAndroid ? 0.85 : 0.78,   // Slower for warmth and clarity
                    pitch: 1.10,  // Higher pitch for gentle, warm, comforting female voice
                    volume: 1.0,  // Clear, comforting volume
                    musicVolume: musicVolume,
                    language: language
                };
            }

            audioService.narrateExpressive(storyTextRef.current, musicUrl, voiceSettings);

            setIsPlaying(true);
            setIsPaused(false);
        }
    };

    const handlePause = () => {
        audioService.pause();
        setIsPaused(true);
        setIsPlaying(false);
    };

    const handleStop = () => {
        audioService.stop();
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
    };

    const handleMusicVolumeChange = (e) => {
        const volume = parseFloat(e.target.value);
        setMusicVolume(volume);
        audioService.setMusicVolume(volume);
    };

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        audioService.setSpeed(speed);
        console.log(`Speed changed to ${speed}x`);
    };

    const handleProgressBarClick = (e) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
        console.log('Seeking to:', percentage.toFixed(1) + '%');
        audioService.seekToProgress(percentage);
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
                                alt={story.title}
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
                            {story.title}
                        </h2>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
                            Starring: <strong>{childName}</strong> ⭐
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
                            {Math.round(progress)}% complete • Click to seek
                        </p>
                    </div>

                    {/* Playback Controls */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        {!isPlaying && !isPaused && (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handlePlay}
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem' }}
                            >
                                ▶️ Play Story
                            </button>
                        )}

                        {isPlaying && (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handlePause}
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem' }}
                            >
                                ⏸️ Pause
                            </button>
                        )}

                        {isPaused && (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={handlePlay}
                                style={{ fontSize: '1.5rem', padding: '1.5rem 3rem' }}
                            >
                                ▶️ Resume
                            </button>
                        )}

                        {(isPlaying || isPaused) && (
                            <button
                                className="btn btn-secondary"
                                onClick={handleStop}
                                style={{ fontSize: '1.2rem', padding: '1.5rem 2rem' }}
                            >
                                ⏹️ Stop
                            </button>
                        )}
                    </div>

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
                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            audioService.stop();
                            navigate(-1);
                        }}
                    >
                        ← Back to Stories
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AudioPlayer;

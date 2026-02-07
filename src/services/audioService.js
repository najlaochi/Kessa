/**
 * Audio Service
 * Handles text-to-speech narration and background music mixing
 */

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.backgroundMusic = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.onProgressCallback = null;
        this.onEndCallback = null;

        // For speed control and seeking
        this.currentSpeed = 1.0;
        this.segments = [];
        this.utteranceQueue = [];
        this.currentSegmentIndex = 0;
        this.storyText = '';
        this.currentOptions = {};
    }

    /**
     * Get available voices (prefer female voices)
     */
    getVoices() {
        return new Promise((resolve) => {
            let voices = this.synth.getVoices();

            if (voices.length > 0) {
                resolve(voices);
            } else {
                // Wait for voices to load
                this.synth.onvoiceschanged = () => {
                    voices = this.synth.getVoices();
                    resolve(voices);
                };
            }
        });
    }

    /**
   * Get the best warm, nurturing female voice for the specified language
   * Optimized for natural, mom-like bedtime storytelling
   */
    async getCalmFemaleVoice(language = 'en') {
        const voices = await this.getVoices();

        // For Arabic - prioritize warm, natural female voices
        if (language === 'ar') {
            // Priority order for Arabic voices for better quality
            const arabicPriority = ['google', 'microsoft', 'apple'];

            const arabicVoices = voices.filter(voice =>
                voice.lang.startsWith('ar') ||
                voice.name.toLowerCase().includes('arabic')
            );

            // Prefer female voices for warm, nurturing tone
            const femaleArabicVoices = arabicVoices.filter(voice =>
                voice.name.toLowerCase().includes('female') ||
                (!voice.name.toLowerCase().includes('male'))
            );

            // Try to find high-quality female voices first
            for (const provider of arabicPriority) {
                const priorityVoice = femaleArabicVoices.find(voice =>
                    voice.name.toLowerCase().includes(provider)
                );
                if (priorityVoice) return priorityVoice;
            }

            if (femaleArabicVoices.length > 0) return femaleArabicVoices[0];
            if (arabicVoices.length > 0) return arabicVoices[0];
        }

        // For English - prefer warm, natural female voices like a mother
        // Priority: Google > Microsoft natural voices > Apple > generic
        const warmMotherlyVoices = [
            // Google female voices (natural, expressive)
            'google uk english female',
            'google us english female',

            // Microsoft natural female voices (warm and clear)
            'microsoft jenny',
            'microsoft aria',
            'microsoft michelle',
            'microsoft helen',

            // Apple female voices (macOS/iOS) - natural and warm
            'samantha',
            'karen',
            'victoria',
            'fiona',
            'serena',
            'allison',
            'susan',
            'ava',

            // Generic female markers
            'female',
            'woman'
        ];

        // Try each warm voice in priority order
        for (const voiceName of warmMotherlyVoices) {
            const voice = voices.find(v =>
                v.lang.startsWith('en') &&
                v.name.toLowerCase().includes(voiceName.toLowerCase())
            );
            if (voice) return voice;
        }

        // Fallback to any English voice
        const langVoices = voices.filter(voice => voice.lang.startsWith(language));
        return langVoices[0] || voices[0];
    }

    /**
   * Start narrating a story with background music
   */
    async narrateExpressive(storyText, musicUrl = null, options = {}) {
        // Stop any current narration
        this.stop();

        const {
            rate = 0.8,
            pitch = 1.05,
            volume = 1.0,
            musicVolume = 0.25,
            language = 'en'
        } = options;

        // Store for seeking
        this.storyText = storyText;
        this.currentOptions = { rate, pitch, volume, musicVolume, language };
        this.musicUrl = musicUrl;

        // Set up background music if provided
        if (musicUrl) {
            this.backgroundMusic = new Audio(musicUrl);
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = musicVolume;

            try {
                await this.backgroundMusic.play();
            } catch (error) {
                console.warn('Background music autoplay blocked:', error);
            }
        }

        // Parse story into segments and store
        this.segments = this.parseStorySegments(storyText);
        const voice = await this.getCalmFemaleVoice(language);

        // Track progress
        let totalChars = storyText.length;

        // Create queue of utterances
        this.utteranceQueue = [];
        this.currentSegmentIndex = 0;

        // Store segment start positions for progress tracking
        const segmentStartPositions = [];
        let charPosition = 0;

        for (let i = 0; i < this.segments.length; i++) {
            segmentStartPositions.push(charPosition);
            charPosition += this.segments[i].text.length;
        }

        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const utterance = new SpeechSynthesisUtterance(segment.text);

            if (voice) {
                utterance.voice = voice;
            }

            // Apply different settings for dialogue vs narration
            if (segment.type === 'dialogue') {
                // Apply dramatic variations based on emotion
                const emotion = segment.emotion || 'normal';

                // Check if this is Arabic (rate will be ~0.85 for Arabic, 0.7 for English)
                const isArabic = rate > 0.8;

                if (isArabic) {
                    // Arabic: Keep speed consistent, vary pitch and volume for expression
                    switch (emotion) {
                        case 'excited': // Exclamations!
                            utterance.rate = rate * this.currentSpeed; // Same speed
                            utterance.pitch = pitch + 0.35; // Higher pitch for excitement
                            utterance.volume = volume * 1.2; // Louder
                            break;

                        case 'question': // Questions?
                            utterance.rate = rate * this.currentSpeed; // Same speed
                            utterance.pitch = pitch + 0.3; // Rising tone for questions
                            utterance.volume = volume * 1.1; // Slightly louder
                            break;

                        case 'whisper': // Whispers
                            utterance.rate = rate * this.currentSpeed; // Same speed
                            utterance.pitch = pitch - 0.15; // Lower pitch
                            utterance.volume = volume * 0.5; // Very quiet
                            break;

                        case 'shout': // SHOUTS
                            utterance.rate = rate * this.currentSpeed; // Same speed
                            utterance.pitch = pitch + 0.4; // Much higher pitch
                            utterance.volume = volume * 1.35; // Much louder
                            break;

                        default: // Normal dialogue
                            utterance.rate = rate * this.currentSpeed; // Same speed
                            utterance.pitch = pitch + 0.2; // Slightly higher for character voice
                            utterance.volume = volume * 1.05;
                    }
                } else {
                    // English: Use speed variations for expression
                    switch (emotion) {
                        case 'excited': // Exclamations!
                            utterance.rate = rate * 1.6 * this.currentSpeed; // Much faster!
                            utterance.pitch = pitch + 0.5; // Much higher pitch
                            utterance.volume = volume * 1.15; // Louder
                            break;

                        case 'question': // Questions?
                            utterance.rate = rate * 1.15 * this.currentSpeed; // Slightly faster
                            utterance.pitch = pitch + 0.45; // High rising tone for questions
                            utterance.volume = volume * 1.05; // Slightly louder
                            break;

                        case 'whisper': // Whispers
                            utterance.rate = rate * 0.75 * this.currentSpeed; // Much slower
                            utterance.pitch = pitch - 0.2; // Lower pitch
                            utterance.volume = volume * 0.5; // Very quiet
                            break;

                        case 'shout': // SHOUTS
                            utterance.rate = rate * 1.7 * this.currentSpeed; // Very fast
                            utterance.pitch = pitch + 0.6; // Very high
                            utterance.volume = volume * 1.3; // Much louder
                            break;

                        default: // Normal dialogue
                            utterance.rate = rate * 1.3 * this.currentSpeed; // Faster for energy
                            utterance.pitch = pitch + 0.3; // Higher for character voice
                            utterance.volume = volume * 1.05;
                    }
                }
            } else {
                // Narration: Calm, steady
                utterance.rate = rate * this.currentSpeed;
                utterance.pitch = pitch;
                utterance.volume = volume * 0.95;
            }

            // Track progress per segment using closure to capture index
            const segmentIndex = i;
            utterance.onboundary = (event) => {
                if (this.onProgressCallback) {
                    const currentProgress = segmentStartPositions[segmentIndex] + event.charIndex;
                    this.onProgressCallback(currentProgress, totalChars);
                }
            };

            this.utteranceQueue.push(utterance);
        }

        // Start speaking queue
        this.speakQueue();
    }

    /**
     * Parse story text into segments (narration vs dialogue)
     * Detects dialogue emotion based on punctuation
     */
    parseStorySegments(storyText) {
        const segments = [];
        let currentIndex = 0;

        // Match dialogue in quotes
        const dialogueRegex = /(["\"'])([^"\"']+)\1/g;
        let match;

        while ((match = dialogueRegex.exec(storyText)) !== null) {
            const quoteStart = match.index;
            const quoteEnd = dialogueRegex.lastIndex;

            // Add narration before dialogue (if any)
            if (quoteStart > currentIndex) {
                const narration = storyText.substring(currentIndex, quoteStart).trim();
                if (narration) {
                    segments.push({ type: 'narration', text: narration });
                }
            }

            // Add dialogue (without quotes) with emotion detection
            const dialogue = match[2].trim();
            if (dialogue) {
                // Detect emotion based on punctuation
                let emotion = 'normal';
                if (dialogue.includes('!')) {
                    emotion = 'excited'; // Exclamations
                } else if (dialogue.includes('?')) {
                    emotion = 'question'; // Questions
                } else if (dialogue.toLowerCase().includes('shh') ||
                    dialogue.toLowerCase().includes('whisper')) {
                    emotion = 'whisper'; // Whispers
                } else if (dialogue.length < 15 && dialogue === dialogue.toUpperCase()) {
                    emotion = 'shout'; // Short all-caps = shouting
                }

                segments.push({
                    type: 'dialogue',
                    text: dialogue,
                    emotion: emotion
                });
            }

            currentIndex = quoteEnd;
        }

        // Add any remaining narration
        if (currentIndex < storyText.length) {
            const narration = storyText.substring(currentIndex).trim();
            if (narration) {
                segments.push({ type: 'narration', text: narration });
            }
        }

        return segments;
    }

    /**
     * Speak utterances from queue sequentially
     */
    speakQueue() {
        if (!this.utteranceQueue || this.utteranceQueue.length === 0) {
            this.isPlaying = false;
            this.stopMusic();
            if (this.onEndCallback) {
                this.onEndCallback();
            }
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;

        const utterance = this.utteranceQueue.shift();
        this.currentUtterance = utterance;

        utterance.onend = () => {
            this.speakQueue();
        };

        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            this.stop();
        };

        this.synth.speak(utterance);
    }

    /**
   * Start narrating a story with background music
   */
    async narrate(storyText, musicUrl = null, options = {}) {
        // Stop any current narration
        this.stop();

        const {
            rate = 0.8, // Natural, gentle bedtime pace
            pitch = 1.05, // Warm, nurturing feminine tone
            volume = 1.0, // Clear, comforting volume
            musicVolume = 0.25, // Subtle background music
            language = 'en'
        } = options;

        // Set up text-to-speech
        this.currentUtterance = new SpeechSynthesisUtterance(storyText);
        const voice = await this.getCalmFemaleVoice(language);

        if (voice) {
            this.currentUtterance.voice = voice;
        }

        this.currentUtterance.rate = rate;
        this.currentUtterance.pitch = pitch;
        this.currentUtterance.volume = volume;

        // Set up background music if provided
        if (musicUrl) {
            this.backgroundMusic = new Audio(musicUrl);
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = musicVolume;

            try {
                await this.backgroundMusic.play();
            } catch (error) {
                console.warn('Background music autoplay blocked:', error);
            }
        }

        // Set up callbacks
        this.currentUtterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
        };

        this.currentUtterance.onend = () => {
            this.isPlaying = false;
            this.stopMusic();
            if (this.onEndCallback) {
                this.onEndCallback();
            }
        };

        this.currentUtterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            this.stop();
        };

        this.currentUtterance.onboundary = (event) => {
            if (this.onProgressCallback) {
                this.onProgressCallback(event.charIndex, storyText.length);
            }
        };

        // Start narration
        this.synth.speak(this.currentUtterance);
    }

    /**
     * Set playback speed (will apply to current and future playback)
     */
    setSpeed(speed) {
        this.currentSpeed = speed;
        console.log(`Speed set to ${speed}x - will apply on next segment`);

        // Note: Speed changes apply to the next segment, not mid-segment
        // The current speaking segment will finish at its current speed
    }

    /**
     * Seek to a specific progress percentage (0-100)
     * NOTE: Currently disabled due to Web Speech API limitations
     */
    async seekToProgress(percentage) {
        console.warn('⚠️ Seeking is temporarily disabled - Web Speech API has limitations');
        console.log(`You tried to seek to ${percentage.toFixed(1)}%`);
        console.log('The story will continue playing from the current position');

        // The Web Speech API doesn't reliably support stopping and restarting mid-playback
        // Attempting to cancel and restart causes "interrupted" errors
        // For now, seeking is disabled - speed control still works!

        return;
    }

    /**
     * Pause narration
     */
    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            if (this.backgroundMusic) {
                this.backgroundMusic.pause();
            }
            this.isPaused = true;
        }
    }

    /**
     * Resume narration
     */
    resume() {
        if (this.isPaused) {
            this.synth.resume();
            if (this.backgroundMusic) {
                this.backgroundMusic.play().catch(console.error);
            }
            this.isPaused = false;
        }
    }

    /**
     * Stop narration and music
     */
    stop() {
        this.synth.cancel();
        this.stopMusic();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
    }

    /**
     * Stop background music
     */
    stopMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.backgroundMusic = null;
        }
    }

    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Set narration speed
     */
    setRate(rate) {
        if (this.currentUtterance) {
            // Note: Changing rate mid-speech requires restart
            // This is a limitation of the Web Speech API
            this.currentUtterance.rate = rate;
        }
    }

    /**
     * Set progress callback
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * Set end callback
     */
    onEnd(callback) {
        this.onEndCallback = callback;
    }

    /**
     * Check if currently playing
     */
    getIsPlaying() {
        return this.isPlaying && !this.isPaused;
    }

    /**
     * Check if paused
     */
    getIsPaused() {
        return this.isPaused;
    }
}

// Export singleton instance
export default new AudioService();

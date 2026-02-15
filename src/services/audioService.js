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
     * Ensure voices are loaded - critical for mobile browsers
     */
    async ensureVoicesLoaded() {
        return new Promise((resolve) => {
            let voices = this.synth.getVoices();

            if (voices.length > 0) {
                console.log(`✅ Voices loaded: ${voices.length} available`);
                resolve(voices);
                return;
            }

            console.log('⏳ Waiting for voices to load...');

            // Mobile browsers often load voices asynchronously
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait

            const checkVoices = () => {
                voices = this.synth.getVoices();
                attempts++;

                if (voices.length > 0) {
                    console.log(`✅ Voices loaded after ${attempts * 100}ms: ${voices.length} available`);
                    resolve(voices);
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Voice loading timeout - using fallback');
                    resolve([]);
                } else {
                    setTimeout(checkVoices, 100);
                }
            };

            // Also listen to the voiceschanged event
            this.synth.onvoiceschanged = () => {
                voices = this.synth.getVoices();
                if (voices.length > 0) {
                    console.log(`✅ Voices loaded via event: ${voices.length} available`);
                    resolve(voices);
                }
            };

            // Start polling
            setTimeout(checkVoices, 100);
        });
    }

    /**
     * Get available voices (prefer female voices)
     */
    async getVoices() {
        return await this.ensureVoicesLoaded();
    }

    /**
   * Get the best warm, nurturing female voice for the specified language
   * Optimized for natural, mom-like bedtime storytelling
   */
    async getCalmFemaleVoice(language = 'en') {
        const voices = await this.getVoices();

        console.log(`🔍 Total voices available: ${voices.length}`);
        console.log('All voices:', voices.map(v => `${v.name} (${v.lang})`).join(', '));

        // For Arabic - prioritize warm, natural female voices
        if (language === 'ar') {
            // Priority order for Arabic voices for better quality
            const arabicPriority = ['google', 'microsoft', 'apple'];

            const arabicVoices = voices.filter(voice =>
                voice.lang.startsWith('ar') ||
                voice.name.toLowerCase().includes('arabic')
            );

            console.log(`🔍 Arabic voices found: ${arabicVoices.length}`);

            // Filter OUT male voices, but accept any that aren't explicitly male
            const nonMaleArabicVoices = arabicVoices.filter(voice => {
                const nameLower = voice.name.toLowerCase();

                // Explicitly exclude male voices
                if (nameLower.includes('male') && !nameLower.includes('female')) {
                    return false;
                }
                if (nameLower.includes('man') && !nameLower.includes('woman')) {
                    return false;
                }
                // Known male names to exclude
                const maleNames = ['majed', 'naayf', 'hamed'];
                if (maleNames.some(name => nameLower.includes(name))) {
                    return false;
                }

                return true; // Accept if not explicitly male
            });

            console.log(`✅ Non-male Arabic voices: ${nonMaleArabicVoices.length}`);

            // Prioritize explicitly female voices if available
            const explicitlyFemaleVoices = nonMaleArabicVoices.filter(voice => {
                const nameLower = voice.name.toLowerCase();
                return nameLower.includes('female') ||
                    nameLower.includes('woman') ||
                    nameLower.includes('نساء') || // Arabic word for women
                    nameLower.includes('أنثى');   // Arabic word for female
            });

            // Try to find high-quality female voices first
            if (explicitlyFemaleVoices.length > 0) {
                for (const provider of arabicPriority) {
                    const priorityVoice = explicitlyFemaleVoices.find(voice =>
                        voice.name.toLowerCase().includes(provider)
                    );
                    if (priorityVoice) {
                        console.log(`🎙️ Selected: ${priorityVoice.name} (${priorityVoice.lang})`);
                        return priorityVoice;
                    }
                }
                console.log(`🎙️ Selected: ${explicitlyFemaleVoices[0].name}`);
                return explicitlyFemaleVoices[0];
            }

            // Use any non-male Arabic voice
            if (nonMaleArabicVoices.length > 0) {
                for (const provider of arabicPriority) {
                    const priorityVoice = nonMaleArabicVoices.find(voice =>
                        voice.name.toLowerCase().includes(provider)
                    );
                    if (priorityVoice) {
                        console.log(`🎙️ Selected (non-male): ${priorityVoice.name} (${priorityVoice.lang})`);
                        return priorityVoice;
                    }
                }
                console.log(`🎙️ Selected (non-male): ${nonMaleArabicVoices[0].name}`);
                return nonMaleArabicVoices[0];
            }

            // Last resort - use any Arabic voice
            if (arabicVoices.length > 0) {
                console.warn('⚠️ Warning: Using first Arabic voice available');
                console.log(`🎙️ Selected (fallback): ${arabicVoices[0].name}`);
                return arabicVoices[0];
            }
        }

        // For English - STRICT female voice selection
        console.log('🔍 Searching for English female voices...');

        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        console.log(`🔍 English voices found: ${englishVoices.length}`);

        // STRICT female filtering
        const femalEnglishVoices = englishVoices.filter(voice => {
            const nameLower = voice.name.toLowerCase();

            // Explicitly exclude male voices
            if (nameLower.includes('male') && !nameLower.includes('female')) {
                return false;
            }
            if (nameLower.includes('man') && !nameLower.includes('woman')) {
                return false;
            }
            if (nameLower.includes('boy')) {
                return false;
            }

            // Known male voice names to exclude
            const maleNames = ['david', 'george', 'james', 'daniel', 'christopher', 'ricky', 'tom', 'mark'];
            if (maleNames.some(name => nameLower.includes(name))) {
                return false;
            }

            return true; // If not explicitly male, assume it might be female
        });

        console.log(`✅ Female English voices after filtering: ${femalEnglishVoices.length}`);
        console.log('Female voices:', femalEnglishVoices.map(v => v.name).join(', '));

        // Priority list of known female voices
        const warmMotherlyVoices = [
            // Google female voices (natural, expressive)
            'google uk english female',
            'google us english female',

            // Microsoft natural female voices (warm and clear)
            'microsoft jenny',
            'microsoft aria',
            'microsoft michelle',
            'microsoft helen',
            'microsoft zira',

            // Apple female voices (macOS/iOS) - natural and warm
            'samantha',
            'karen',
            'victoria',
            'fiona',
            'serena',
            'allison',
            'susan',
            'ava',
            'nicky',
            'moira',
            'tessa',

            // Generic female markers
            'female',
            'woman'
        ];

        // Try each warm voice in priority order
        for (const voiceName of warmMotherlyVoices) {
            const voice = femalEnglishVoices.find(v =>
                v.name.toLowerCase().includes(voiceName.toLowerCase())
            );
            if (voice) {
                console.log(`🎙️ Selected priority female voice: ${voice.name} (${voice.lang})`);
                return voice;
            }
        }

        // If we have any female English voices, use the first one
        if (femalEnglishVoices.length > 0) {
            console.log(`🎙️ Selected first female voice: ${femalEnglishVoices[0].name}`);
            return femalEnglishVoices[0];
        }

        // Last resort - if no female-specific voice found, try any English voice
        console.warn('⚠️ Warning: Could not find explicit female voice!');
        if (englishVoices.length > 0) {
            console.warn(`Using: ${englishVoices[0].name} - may not be female`);
            return englishVoices[0];
        }

        // Absolute fallback
        console.error('❌ No voices available for this language!');
        return voices[0] || null;
    }

    /**
   * Start narrating a story with background music
   */
    async narrateExpressive(storyText, musicUrl = null, options = {}) {
        // Stop any current narration
        this.stop();

        console.log('🎙️ Starting narration with options:', options);

        const {
            rate = 0.8,
            pitch = 1.05,
            volume = 1.0,
            musicVolume = 0.25,
            language = 'en'
        } = options;

        console.log(`📖 Story length: ${storyText.length} characters`);
        console.log(`🌍 Language: ${language}`);

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
                console.log('🎵 Background music started');
            } catch (error) {
                console.warn('⚠️ Background music autoplay blocked:', error);
            }
        }

        // Parse story into segments and store
        this.segments = this.parseStorySegments(storyText);
        console.log(`📝 Parsed into ${this.segments.length} segments`);

        const voice = await this.getCalmFemaleVoice(language);

        if (!voice) {
            console.error('❌ No voice found for language:', language);
            alert(`No ${language} voice available on this device. Please install Text-to-Speech voices in your device settings.`);
            this.stop();
            return;
        }

        console.log(`🗣️ Using voice: ${voice.name} (${voice.lang})`);

        // Store voice for resumeFromSegment to use
        this.currentVoice = voice;

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

                // Check language properly instead of guessing from rate
                const isArabic = language === 'ar';

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

        utterance.onstart = () => {
            console.log('🎙️ Speech started');
        };

        utterance.onend = () => {
            console.log('✅ Speech segment complete');
            this.speakQueue();
        };

        utterance.onerror = (error) => {
            console.error('❌ Speech synthesis error:', error);
            // Try to continue with next segment instead of stopping completely
            if (error.error !== 'interrupted') {
                this.speakQueue();
            }
        };

        console.log('🎤 Speaking:', utterance.text.substring(0, 50) + '...');
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
     * Set playback speed
     * Cancels current speech and resumes from next segment with new speed
     */
    setSpeed(speed) {
        this.currentSpeed = speed;
        console.log(`⚡ Speed set to ${speed}x`);

        // If currently playing, we need to restart from current segment with new speed
        if (this.isPlaying && !this.isPaused) {
            const currentSegment = this.currentSegmentIndex;
            console.log(`🔄 Applying new speed from segment ${currentSegment + 1}`);

            // Cancel current speech
            this.synth.cancel();

            // Resume from next segment with new speed
            this.resumeFromSegment(currentSegment + 1);
        }
    }

    /**
     * Resume narration from a specific segment index
     */
    resumeFromSegment(startIndex) {
        if (!this.segments || startIndex >= this.segments.length) {
            console.log('✅ Narration complete');
            this.isPlaying = false;
            return;
        }

        console.log(`▶️ Resuming from segment ${startIndex}/${this.segments.length}`);

        // Speak remaining segments
        for (let i = startIndex; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const utterance = new SpeechSynthesisUtterance(segment.text);

            // Apply current settings with current speed
            utterance.voice = this.currentVoice;
            utterance.lang = this.currentVoice?.lang || 'en-US';

            const rate = this.currentOptions?.rate || 0.8;
            const pitch = this.currentOptions?.pitch || 1.0;
            const volume = this.currentOptions?.volume || 1.0;
            const language = this.currentOptions?.language || 'en';

            // Apply speed and type settings based on language
            if (segment.type === 'dialogue') {
                const emotion = segment.emotion || 'normal';
                const isArabic = language === 'ar';

                if (isArabic) {
                    // Arabic: Keep speed consistent, vary pitch and volume
                    switch (emotion) {
                        case 'excited':
                            utterance.rate = rate * this.currentSpeed;
                            utterance.pitch = pitch + 0.35;
                            utterance.volume = volume * 1.2;
                            break;
                        case 'question':
                            utterance.rate = rate * this.currentSpeed;
                            utterance.pitch = pitch + 0.3;
                            utterance.volume = volume * 1.1;
                            break;
                        case 'whisper':
                            utterance.rate = rate * this.currentSpeed;
                            utterance.pitch = pitch - 0.15;
                            utterance.volume = volume * 0.5;
                            break;
                        case 'shout':
                            utterance.rate = rate * this.currentSpeed;
                            utterance.pitch = pitch + 0.4;
                            utterance.volume = volume * 1.35;
                            break;
                        default:
                            utterance.rate = rate * this.currentSpeed;
                            utterance.pitch = pitch + 0.2;
                            utterance.volume = volume * 1.05;
                    }
                } else {
                    // English: Use speed variations for expression
                    switch (emotion) {
                        case 'excited':
                            utterance.rate = rate * 1.6 * this.currentSpeed;
                            utterance.pitch = pitch + 0.5;
                            utterance.volume = volume * 1.15;
                            break;
                        case 'question':
                            utterance.rate = rate * 1.15 * this.currentSpeed;
                            utterance.pitch = pitch + 0.45;
                            utterance.volume = volume * 1.05;
                            break;
                        case 'whisper':
                            utterance.rate = rate * 0.75 * this.currentSpeed;
                            utterance.pitch = pitch - 0.2;
                            utterance.volume = volume * 0.5;
                            break;
                        case 'shout':
                            utterance.rate = rate * 1.7 * this.currentSpeed;
                            utterance.pitch = pitch + 0.6;
                            utterance.volume = volume * 1.3;
                            break;
                        default:
                            utterance.rate = rate * 1.3 * this.currentSpeed;
                            utterance.pitch = pitch + 0.3;
                            utterance.volume = volume * 1.05;
                    }
                }
            } else {
                utterance.rate = rate * this.currentSpeed;
                utterance.pitch = pitch;
                utterance.volume = volume * 0.95;
            }

            // Track segment index
            utterance.onstart = () => {
                this.currentSegmentIndex = i;
                this.currentUtterance = utterance;
            };

            utterance.onend = () => {
                if (i === this.segments.length - 1) {
                    this.isPlaying = false;
                    console.log('✅ Story complete');
                }
            };

            this.synth.speak(utterance);
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

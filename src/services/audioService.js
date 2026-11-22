/**
 * Audio Service
 * Handles text-to-speech narration and background music mixing
 */

import ttsService from './ttsService.js';
// Native TTS removed — web-only PWA
import PlatformUtils from '../utils/platformUtils.js';

class AudioService {
    constructor() {
        // Platform detection for native vs web TTS
        this.isNative = PlatformUtils.isNative();
        this.tts = ttsService;

        // speechSynthesis is only available on web, not on native Android/iOS
        this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        this.currentUtterance = null;
        this.backgroundMusic = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.onProgressCallback = null;
        this.onEndCallback = null;

        // Arabic TTS — Google Translate audio elements
        this._arabicAudio = null;   // currently playing <audio> element
        this._arabicAborted = false;

        // For speed control and seeking
        this.currentSpeed = 1.0;
        this.segments = [];
        this.utteranceQueue = [];
        this.currentSegmentIndex = 0;
        this.currentCharIndex = 0;   // tracks absolute char position via onboundary
        this.storyText = '';
        this.currentOptions = {};

        // Keepalive timer + visibility handler
        this._keepAliveTimer = null;
        this._visibilityHandler = null;
        console.log(`🎵 AudioService initialized for ${PlatformUtils.getPlatform()}`);
    }

    /**
     * Detect if we're on a mobile browser where Web Speech API is unreliable.
     */
    _isMobile() {
        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }

    /**
     * Split text into chunks safe for Google Translate TTS (max ~200 chars each).
     * Splits at sentence boundaries to keep speech natural.
     */
    _splitForGoogleTTS(text, maxLen = 190) {
        const chunks = [];
        // Split at sentence endings
        const sentences = text.split(/(?<=[.!?\u061F\u0964])\s+/);
        let current = '';

        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (!trimmed) continue;

            if (current.length + trimmed.length + 1 > maxLen && current.length > 0) {
                chunks.push(current.trim());
                current = trimmed;
            } else {
                current += (current ? ' ' : '') + trimmed;
            }
        }
        if (current.trim()) chunks.push(current.trim());

        // If no sentence breaks were found, split at word boundaries
        if (chunks.length === 0) {
            const words = text.split(/\s+/);
            current = '';
            for (const word of words) {
                if (current.length + word.length + 1 > maxLen && current.length > 0) {
                    chunks.push(current.trim());
                    current = word;
                } else {
                    current += (current ? ' ' : '') + word;
                }
            }
            if (current.trim()) chunks.push(current.trim());
        }

        return chunks.length > 0 ? chunks : [text.substring(0, maxLen)];
    }

    /**
     * Play story via Google Translate TTS (actual MP3 audio).
     * Uses translate.googleapis.com with client=gtx which works from web pages.
     * Returns a Promise that:
     *   - RESOLVES as soon as the first chunk starts playing (narration continues autonomously)
     *   - REJECTS if the first chunk fails to load/play (caller should fallback)
     */
    _playViaGoogleTTS(text, language, rate = 1.0, volume = 1.0) {
        return new Promise((resolve, reject) => {
            const langCode = language === 'ar' ? 'ar' : 'en';
            const chunks = this._splitForGoogleTTS(text);
            const totalChars = text.length;
            let charOffset = 0;
            let chunkIndex = 0;
            let firstChunkStarted = false;
            let settled = false; // track if promise already resolved/rejected

            console.log(`🔊 Google TTS: ${chunks.length} chunks, lang=${langCode}`);

            this.isPlaying = true;
            this.isPaused = false;
            this._googleTTSAborted = false;

            const playNextChunk = () => {
                if (this._googleTTSAborted || !this.isPlaying || chunkIndex >= chunks.length) {
                    if (this.isPlaying && !this._googleTTSAborted) {
                        console.log('✅ Google TTS narration complete');
                        this.isPlaying = false;
                        this.stopMusic();
                        if (this.onEndCallback) this.onEndCallback();
                    }
                    return;
                }

                const chunk = chunks[chunkIndex];
                const encodedText = encodeURIComponent(chunk);
                const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${langCode}&client=gtx&q=${encodedText}`;

                const audio = new Audio(url);
                audio.volume = volume;
                this._currentGoogleAudio = audio;

                const myOffset = charOffset;

                audio.addEventListener('timeupdate', () => {
                    if (audio.duration && this.onProgressCallback) {
                        const chunkProgress = audio.currentTime / audio.duration;
                        const charPos = myOffset + Math.floor(chunkProgress * chunk.length);
                        this.currentCharIndex = charPos;
                        this.onProgressCallback(charPos, totalChars);
                    }
                });

                audio.addEventListener('canplaythrough', () => {
                    audio.playbackRate = Math.min(Math.max(rate, 0.5), 2.0);
                }, { once: true });

                audio.addEventListener('playing', () => {
                    if (!firstChunkStarted) {
                        firstChunkStarted = true;
                        console.log('✅ Google TTS is working!');
                        // Resolve promise — narration started successfully, continues on its own
                        if (!settled) { settled = true; resolve(); }
                    }
                }, { once: true });

                audio.addEventListener('ended', () => {
                    if (this._googleTTSAborted) return;
                    charOffset += chunk.length + 1;
                    chunkIndex++;
                    playNextChunk();
                });

                audio.addEventListener('error', () => {
                    console.warn(`⚠️ Google TTS chunk ${chunkIndex + 1} failed`);
                    if (!firstChunkStarted && !settled) {
                        settled = true;
                        reject(new Error('Google TTS unavailable'));
                        return;
                    }
                    charOffset += chunk.length + 1;
                    chunkIndex++;
                    playNextChunk();
                });

                console.log(`🗣️ Google TTS chunk ${chunkIndex + 1}/${chunks.length}`);
                audio.play().catch(err => {
                    console.warn('❌ Google TTS play error:', err.message);
                    if (!firstChunkStarted && !settled) {
                        settled = true;
                        reject(new Error('Google TTS play failed'));
                        return;
                    }
                    charOffset += chunk.length + 1;
                    chunkIndex++;
                    playNextChunk();
                });
            };

            playNextChunk();
        });
    }

    /**
     * Stop Google TTS playback
     */
    _stopGoogleTTS() {
        this._googleTTSAborted = true;
        if (this._currentGoogleAudio) {
            this._currentGoogleAudio.pause();
            this._currentGoogleAudio.src = '';
            this._currentGoogleAudio = null;
        }
    }

    _stopKeepAlive() {
        // No longer used, but kept for compatibility
    }

    /**
     * Ensure voices are loaded - critical for mobile browsers
     */
    async ensureVoicesLoaded() {
        // Native Android/iOS has no speechSynthesis
        if (!this.synth) {
            console.log('⚠️ No speechSynthesis available (native platform)');
            return [];
        }

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
        this.currentCharIndex = 0; // reset progress tracker

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
        // Map short language codes to BCP-47 tags
        const langMap = { ar: 'ar-SA', en: 'en-US' };
        const bcp47Lang = langMap[language] || language;

        const voice = await this.getCalmFemaleVoice(language);
        console.log(`🗣️ Using voice: ${voice ? `${voice.name} (${voice.lang})` : 'none — browser default'}`);
        this.currentVoice = voice;

        // If Arabic and no voice available, try Google TTS audio fallback
        if (language === 'ar' && !voice && !this.isNative) {
            console.log('🌍 No browser Arabic voice → trying Google Translate TTS');
            try {
                await this._playViaGoogleTTS(storyText, language, rate * this.currentSpeed, volume);
            } catch (err) {
                console.error('❌ Google TTS failed:', err);
            }
            return;
        }

        const effectiveRate = rate * this.currentSpeed;
        const totalChars = storyText.length;

        // ── MOBILE: Simple chunk chaining (no Google TTS, no complexity) ───
        // Split into small chunks (~120 chars ≈ 6 seconds), chain via onend.
        // Each chunk stays well under Android Chrome's 15s kill timeout.
        if (this._isMobile()) {
            const chunks = this._splitForGoogleTTS(storyText, 120);
            let chunkIdx = 0;
            let charOffset = 0;
            let safetyTimer = null;

            console.log(`📱 Mobile: speaking ${chunks.length} chunks via speechSynthesis`);

            this.isPlaying = true;
            this.isPaused = false;
            this.currentCharIndex = 0;
            this.synth.cancel();

            const clearSafety = () => {
                if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
            };

            const speakNextChunk = () => {
                clearSafety();
                if (!this.isPlaying || chunkIdx >= chunks.length) {
                    if (this.isPlaying) {
                        console.log('✅ Story narration complete');
                        this.isPlaying = false;
                        this.stopMusic();
                        if (this.onEndCallback) this.onEndCallback();
                    }
                    return;
                }

                const chunk = chunks[chunkIdx];
                const u = new SpeechSynthesisUtterance(chunk);
                u.lang = bcp47Lang;
                if (voice) u.voice = voice;
                u.rate = effectiveRate;
                u.pitch = pitch;
                u.volume = volume;

                this.currentUtterance = u;

                u.onstart = () => {
                    console.log(`🗣️ Chunk ${chunkIdx + 1}/${chunks.length} (${chunk.length} chars)`);
                    // Safety: if onend doesn't fire within 12s, force next chunk
                    clearSafety();
                    safetyTimer = setTimeout(() => {
                        console.warn(`⏰ Chunk ${chunkIdx + 1} safety timeout — forcing next`);
                        this.synth.cancel();
                        charOffset += chunk.length + 1;
                        chunkIdx++;
                        speakNextChunk();
                    }, 12000);
                };

                u.onend = () => {
                    clearSafety();
                    if (!this.isPlaying) return;
                    charOffset += chunk.length + 1;
                    this.currentCharIndex = charOffset;
                    if (this.onProgressCallback) {
                        this.onProgressCallback(charOffset, totalChars);
                    }
                    chunkIdx++;
                    speakNextChunk();
                };

                u.onerror = (e) => {
                    clearSafety();
                    if (e.error === 'interrupted' || e.error === 'canceled') return;
                    console.warn(`⚠️ Chunk ${chunkIdx + 1} error: ${e.error}`);
                    charOffset += chunk.length + 1;
                    chunkIdx++;
                    speakNextChunk();
                };

                this.synth.speak(u);
            };

            speakNextChunk();
            return;
        }

        // ── DESKTOP: Single utterance (works fine on desktop Chrome) ──────
        const utterance = new SpeechSynthesisUtterance(storyText);
        utterance.lang = bcp47Lang;
        if (voice) utterance.voice = voice;
        utterance.rate = effectiveRate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        this.currentUtterance = utterance;

        utterance.onboundary = (event) => {
            this.currentCharIndex = event.charIndex || 0;
            if (this.onProgressCallback) {
                this.onProgressCallback(this.currentCharIndex, totalChars);
            }
        };

        utterance.onend = () => {
            if (!this.isPlaying) return;
            console.log('✅ Story narration complete');
            this.isPlaying = false;
            this.stopMusic();
            if (this.onEndCallback) this.onEndCallback();
        };

        utterance.onerror = (e) => {
            if (e.error === 'interrupted' || e.error === 'canceled') return;
            console.error('❌ Speech error:', e.error);
        };

        this.isPlaying = true;
        this.isPaused = false;
        this.synth.cancel();
        this.synth.speak(utterance);
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
    async speakQueue() {
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

        // Native Android: Speak all segments as one continuous text
        if (this.isNative) {
            console.log(`🎤 Native TTS: Speaking ${this.utteranceQueue.length} segments`);

            // Combine all segments into one text
            const fullText = this.utteranceQueue.map(u => u.text).join(' ');
            const firstUtterance = this.utteranceQueue[0];

            try {
                await this.tts.speak(fullText, {
                    rate: firstUtterance.rate || 1.0,
                    pitch: firstUtterance.pitch || 1.0,
                    volume: firstUtterance.volume || 1.0,
                    language: firstUtterance.lang || 'en-US'
                });

                console.log('✅ Native TTS: Speech complete');

                // Clear queue and end
                this.utteranceQueue = [];
                this.isPlaying = false;
                this.stopMusic();
                if (this.onEndCallback) {
                    this.onEndCallback();
                }
            } catch (error) {
                console.error('❌ Native TTS error:', error);
                this.isPlaying = false;
                this.stopMusic();
                if (this.onEndCallback) {
                    this.onEndCallback();
                }
            }
            return;
        }

        // Web browser: Use Web Speech API with queuing
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

        // Map short language codes to BCP-47 tags
        const langMap = { ar: 'ar-SA', en: 'en-US' };
        this.currentUtterance.lang = langMap[language] || language;

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
            if (this.isNative) {
                // Native TTS doesn't support pause - we stop instead
                console.warn('⚠️ Native TTS doesn\'t support pause - stopping instead');
                this.stop();
            } else if (this.synth) {
                this.synth.pause();
                if (this.backgroundMusic) {
                    this.backgroundMusic.pause();
                }
                this.isPaused = true;
            }
        }
    }

    /**
     * Resume narration
     */
    resume() {
        if (this.isPaused) {
            if (this.isNative) {
                console.warn('⚠️ Native TTS doesn\'t support resume - please replay');
            } else if (this.synth) {
                this.synth.resume();
                if (this.backgroundMusic) {
                    this.backgroundMusic.play().catch(console.error);
                }
                this.isPaused = false;
            }
        }
    }

    /**
     * Set playback speed — restarts from current char position with new speed
     */
    setSpeed(speed) {
        this.currentSpeed = speed;
        console.log(`⚡ Speed set to ${speed}x`);

        if (!this.isPlaying || this.isPaused) return;

        console.log(`🔄 Restarting from char ${this.currentCharIndex} with speed ${speed}x`);

        // Get the remaining text from the current position
        const remainingText = this.storyText
            ? this.storyText.substring(this.currentCharIndex)
            : null;

        if (!remainingText || remainingText.trim().length === 0) return;

        if (this.synth) {
            // Cancel web speech, rebuild queue from remaining text
            this.synth.cancel();

            // Re-parse remaining text into segments and speak with new speed
            const { rate = 0.8, pitch = 1.05, volume = 1.0, language = 'en' } = this.currentOptions || {};
            const remainingSegments = this.parseStorySegments(remainingText);
            const isArabic = language === 'ar';

            this.utteranceQueue = [];
            for (const segment of remainingSegments) {
                const utt = new SpeechSynthesisUtterance(segment.text);
                utt.voice = this.currentVoice;
                utt.lang = this.currentVoice?.lang || (isArabic ? 'ar-SA' : 'en-US');

                if (segment.type === 'dialogue') {
                    utt.rate = rate * speed * (isArabic ? 1.0 : 1.3);
                    utt.pitch = pitch + (isArabic ? 0.2 : 0.3);
                    utt.volume = volume * 1.05;
                } else {
                    utt.rate = rate * speed;
                    utt.pitch = pitch;
                    utt.volume = volume * 0.95;
                }
                this.utteranceQueue.push(utt);
            }
            this.speakQueue();
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

            if (this.isNative) {
                // For native TTS, combine and speak as one
                const remainingText = this.segments.slice(i).map(s => s.text).join(' ');
                this.tts.speak(remainingText, {
                    rate: utterance.rate,
                    pitch: utterance.pitch,
                    volume: utterance.volume,
                    language: utterance.lang
                }).then(() => {
                    this.isPlaying = false;
                    console.log('✅ Story complete');
                });
                break; // Exit loop since we speak all at once
            } else {
                this.synth.speak(utterance);
            }
        }
    }

    /**
     * Stop narration and music
     */
    stop() {
        this._stopKeepAlive();
        this._stopGoogleTTS();

        if (this.isNative) {
            this.tts.stop();
        } else if (this.synth) {
            this.synth.cancel();
        }

        // Stop any Arabic Google TTS audio
        this._arabicAborted = true;
        if (this._arabicAudio) {
            this._arabicAudio.pause();
            this._arabicAudio.src = '';
            this._arabicAudio = null;
        }

        this.stopMusic();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
    }

    /**
     * Speak Arabic text using Google Translate TTS audio.
     * Splits long text into sentence-safe chunks ≤ 200 chars.
     * Gives a warm, natural Arabic female voice on all browsers.
     */
    async speakArabicViaGoogleTTS(text, { rate = 1.0, volume = 1.0 } = {}) {
        this.isPlaying = true;
        this.isPaused = false;
        this._arabicAborted = false;

        // Split into sentence-safe chunks ≤ 200 chars
        const chunks = this._splitArabicChunks(text, 200);
        console.log(`🔊 Arabic TTS: ${chunks.length} chunks to speak`);

        const totalLen = text.length;
        let charsSeen = 0;

        for (let i = 0; i < chunks.length; i++) {
            if (this._arabicAborted) break;

            const chunk = chunks[i];
            const encodedChunk = encodeURIComponent(chunk);
            // Google Translate TTS endpoint (client=tw-ob avoids quota restrictions)
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodedChunk}`;

            console.log(`🔊 Chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 40)}..."`);

            try {
                await new Promise((resolve, reject) => {
                    const audio = new Audio();
                    // Do NOT set crossOrigin — it causes CORS preflight failures with Google TTS
                    audio.volume = Math.min(1, Math.max(0, volume));
                    // Rate mapping: playbackRate 1 = normal, Google TTS has fixed speed;
                    // we approximate by adjusting playbackRate (works in all browsers)
                    audio.playbackRate = Math.min(2, Math.max(0.5, rate));

                    this._arabicAudio = audio;

                    audio.onended = () => {
                        charsSeen += chunk.length;
                        if (this.onProgressCallback) {
                            this.onProgressCallback(Math.min(charsSeen, totalLen), totalLen);
                        }
                        resolve();
                    };

                    audio.onerror = (e) => {
                        console.error('❌ Arabic TTS audio error:', e);
                        reject(e);
                    };

                    audio.src = url;
                    audio.play().catch(reject);
                });
            } catch (err) {
                console.error('❌ Failed to play Arabic chunk:', err);
                // Try to continue with next chunk
            }
        }

        this._arabicAudio = null;
        this.isPlaying = false;
        this.stopMusic();
        if (!this._arabicAborted && this.onEndCallback) {
            this.onEndCallback();
        }
    }

    /**
     * Split Arabic text into chunks of maxLen chars, breaking at sentence/clause
     * boundaries (. ? ! ، ؟ !) to avoid cutting mid-word.
     */
    _splitArabicChunks(text, maxLen = 200) {
        const chunks = [];
        // Sentence-ending punctuation (Arabic + Latin)
        const sentenceEnd = /[.!?،؟!\n]+/g;

        // Collect sentence boundaries
        const sentences = [];
        let last = 0;
        let m;
        while ((m = sentenceEnd.exec(text)) !== null) {
            const end = m.index + m[0].length;
            sentences.push(text.slice(last, end).trim());
            last = end;
        }
        if (last < text.length) {
            sentences.push(text.slice(last).trim());
        }

        let current = '';
        for (const sentence of sentences) {
            if (!sentence) continue;
            if ((current + sentence).length > maxLen && current.length > 0) {
                chunks.push(current.trim());
                current = sentence + ' ';
            } else {
                current += sentence + ' ';
            }
        }
        if (current.trim()) chunks.push(current.trim());

        // Safety: if any chunk is still > maxLen, hard-split at word boundary
        const safe = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxLen) { safe.push(chunk); continue; }
            const words = chunk.split(' ');
            let part = '';
            for (const word of words) {
                if ((part + word).length > maxLen && part.length > 0) {
                    safe.push(part.trim());
                    part = word + ' ';
                } else {
                    part += word + ' ';
                }
            }
            if (part.trim()) safe.push(part.trim());
        }
        return safe;
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

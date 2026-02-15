/**
 * Google Cloud Text-to-Speech Service
 * Provides high-quality, human-like voice synthesis for multiple languages
 */

import axios from 'axios';
import { TTS_CONFIG, getVoiceConfig, getAudioConfig } from '../config/ttsConfig';

class CloudTTSService {
    constructor() {
        this.apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
        this.cache = new Map();
        this.loadCacheFromStorage();
    }

    /**
     * Convert text to speech using Google Cloud TTS
     * @param {string} text - Text to synthesize
     * @param {string} language - Language code ('ar' or 'en')
     * @param {number} speed - Speaking rate multiplier (0.5 - 2.0)
     * @returns {Promise<string>} - Base64 encoded audio data URL
     */
    async textToSpeech(text, language = 'en', speed = 1.0) {
        if (!this.apiKey) {
            throw new Error('Google Cloud API key not configured. Please add VITE_GOOGLE_CLOUD_API_KEY to your .env file.');
        }

        // Check cache first
        const cacheKey = this.getCacheKey(text, language, speed);
        if (TTS_CONFIG.cache.enabled && this.cache.has(cacheKey)) {
            console.log('🎯 Using cached audio');
            return this.cache.get(cacheKey);
        }

        console.log(`🎙️ Generating speech with Google Cloud TTS (${language}, ${speed}x)`);

        try {
            const voiceConfig = getVoiceConfig(language);
            const audioConfig = getAudioConfig(speed);

            const requestBody = {
                input: { text },
                voice: {
                    languageCode: voiceConfig.languageCode,
                    name: voiceConfig.name,
                    ssmlGender: voiceConfig.ssmlGender
                },
                audioConfig
            };

            const response = await axios.post(
                `${TTS_CONFIG.api.endpoint}?key=${this.apiKey}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Convert base64 audio to data URL
            const audioContent = response.data.audioContent;
            const audioDataUrl = `data:audio/mp3;base64,${audioContent}`;

            // Cache the result
            if (TTS_CONFIG.cache.enabled) {
                this.addToCache(cacheKey, audioDataUrl);
            }

            console.log('✅ Speech generated successfully');
            return audioDataUrl;

        } catch (error) {
            console.error('❌ Google Cloud TTS error:', error.response?.data || error.message);
            
            // Return null to trigger fallback to Web Speech API
            if (error.response?.status === 403) {
                throw new Error('API key invalid or API not enabled. Please check your Google Cloud setup.');
            }
            
            throw error;
        }
    }

    /**
     * Split long text into chunks for API call
     * @param {string} text - Full text
     * @returns {Array<string>} - Array of text chunks
     */
    splitTextIntoChunks(text) {
        const maxChars = TTS_CONFIG.api.maxCharacters;
        
        if (text.length <= maxChars) {
            return [text];
        }

        const chunks = [];
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let currentChunk = '';

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxChars) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                } else {
                    // Single sentence too long, split by words
                    chunks.push(sentence.substring(0, maxChars));
                    currentChunk = sentence.substring(maxChars);
                }
            } else {
                currentChunk += sentence;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Generate audio for multiple text chunks
     * @param {string} text - Full text
     * @param {string} language - Language code
     * @param {number} speed - Speaking rate
     * @returns {Promise<Array<string>>} - Array of audio data URLs
     */
    async textToSpeechChunked(text, language = 'en', speed = 1.0) {
        const chunks = this.splitTextIntoChunks(text);
        console.log(`📝 Split into ${chunks.length} chunks`);

        const audioUrls = [];
        
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🎙️ Processing chunk ${i + 1}/${chunks.length}`);
            const audioUrl = await this.textToSpeech(chunks[i], language, speed);
            audioUrls.push(audioUrl);
        }

        return audioUrls;
    }

    /**
     * Generate cache key
     */
    getCacheKey(text, language, speed) {
        return `${language}_${speed}_${text.substring(0, 100)}`;
    }

    /**
     * Add to cache with size limit
     */
    addToCache(key, value) {
        // Remove oldest if cache is full
        if (this.cache.size >= TTS_CONFIG.cache.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, value);
        this.saveCacheToStorage();
    }

    /**
     * Load cache from localStorage
     */
    loadCacheFromStorage() {
        try {
            const cached = localStorage.getItem(TTS_CONFIG.cache.storageKey);
            if (cached) {
                const cacheArray = JSON.parse(cached);
                this.cache = new Map(cacheArray);
                console.log(`📦 Loaded ${this.cache.size} cached audio files`);
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
    }

    /**
     * Save cache to localStorage
     */
    saveCacheToStorage() {
        try {
            const cacheArray = Array.from(this.cache.entries());
            localStorage.setItem(TTS_CONFIG.cache.storageKey, JSON.stringify(cacheArray));
        } catch (error) {
            console.warn('Failed to save cache:', error);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        localStorage.removeItem(TTS_CONFIG.cache.storageKey);
        console.log('🗑️ Cache cleared');
    }

    /**
     * Get available voices for a language
     */
    getAvailableVoices(language = 'en') {
        return getVoiceConfig(language);
    }
}

// Export singleton instance
const cloudTTSService = new CloudTTSService();
export default cloudTTSService;

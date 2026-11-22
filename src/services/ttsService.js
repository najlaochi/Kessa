/**
 * TTS Service Wrapper
 * Web-only: Uses Web Speech API (window.speechSynthesis)
 * Arabic audio is handled separately via Google Translate TTS in audioService.js
 */

class TTSService {
    constructor() {
        this.currentUtterance = null;
        this.isPaused = false;
        this.currentRate = 1.0;
        this.currentPitch = 1.0;
        this.currentVolume = 1.0;
        this.currentLanguage = 'en-US';

        console.log('🎙️ TTS Service initialized (Web Speech API)');
    }

    /**
     * Speak text using Web Speech API
     */
    async speak(text, options = {}) {
        const {
            rate = 1.0,
            pitch = 1.0,
            volume = 1.0,
            language = 'en-US',
            voice = null
        } = options;

        this.currentRate = rate;
        this.currentPitch = pitch;
        this.currentVolume = volume;
        this.currentLanguage = language;

        if (!window.speechSynthesis) {
            throw new Error('Web Speech API not supported');
        }

        this.currentUtterance = new SpeechSynthesisUtterance(text);

        if (voice) {
            this.currentUtterance.voice = voice;
        }

        this.currentUtterance.rate = rate;
        this.currentUtterance.pitch = pitch;
        this.currentUtterance.volume = volume;
        this.currentUtterance.lang = language;

        window.speechSynthesis.speak(this.currentUtterance);
        console.log('✅ Web Speech API: Speech started');
    }

    /**
     * Stop speaking
     */
    async stop() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            console.log('⏹️ Web Speech API: Stopped');
        }
        this.isPaused = false;
    }

    /**
     * Pause speaking
     */
    pause() {
        if (window.speechSynthesis) {
            window.speechSynthesis.pause();
            this.isPaused = true;
            console.log('⏸️ Web Speech API: Paused');
        }
    }

    /**
     * Resume speaking
     */
    resume() {
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
            this.isPaused = false;
            console.log('▶️ Web Speech API: Resumed');
        }
    }

    /**
     * Get available voices
     */
    async getVoices() {
        if (!window.speechSynthesis) {
            return [];
        }

        return new Promise((resolve) => {
            let voices = window.speechSynthesis.getVoices();

            if (voices.length > 0) {
                resolve(voices);
            } else {
                window.speechSynthesis.onvoiceschanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    resolve(voices);
                };
            }
        });
    }

    /**
     * Check if TTS is supported
     */
    isSupported() {
        return 'speechSynthesis' in window;
    }

    /**
     * Check if currently speaking
     */
    isSpeaking() {
        return window.speechSynthesis ? window.speechSynthesis.speaking : false;
    }
}

// Export singleton instance
export default new TTSService();

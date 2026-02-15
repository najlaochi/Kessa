/**
 * Voice Settings Helper
 * Helps users pick the best available voice for their device
 */

/**
 * Get all available voices grouped by language
 */
export async function getAvailableVoices() {
    return new Promise((resolve) => {
        const synth = window.speechSynthesis;
        let voices = synth.getVoices();

        if (voices.length > 0) {
            resolve(groupVoicesByLanguage(voices));
            return;
        }

        // Wait for voices to load
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            resolve(groupVoicesByLanguage(voices));
        };

        // Timeout after 3 seconds
        setTimeout(() => {
            resolve(groupVoicesByLanguage(synth.getVoices()));
        }, 3000);
    });
}

/**
 * Group voices by language
 */
function groupVoicesByLanguage(voices) {
    const grouped = {
        ar: [],
        en: [],
        other: []
    };

    voices.forEach(voice => {
        const lang = voice.lang.toLowerCase();
        if (lang.startsWith('ar')) {
            grouped.ar.push({
                name: voice.name,
                lang: voice.lang,
                quality: estimateQuality(voice.name)
            });
        } else if (lang.startsWith('en')) {
            grouped.en.push({
                name: voice.name,
                lang: voice.lang,
                quality: estimateQuality(voice.name)
            });
        } else {
            grouped.other.push({
                name: voice.name,
                lang: voice.lang
            });
        }
    });

    // Sort by quality
    grouped.ar.sort((a, b) => b.quality - a.quality);
    grouped.en.sort((a, b) => b.quality - a.quality);

    return grouped;
}

/**
 * Estimate voice quality based on name
 */
function estimateQuality(voiceName) {
    const name = voiceName.toLowerCase();
    let score = 0;

    // Quality indicators
    if (name.includes('wavenet')) score += 100;
    if (name.includes('neural')) score += 90;
    if (name.includes('premium')) score += 80;
    if (name.includes('enhanced')) score += 70;
    if (name.includes('google')) score += 60;
    if (name.includes('microsoft')) score += 50;
    if (name.includes('natural')) score += 40;
    if (name.includes('high')) score += 30;

    // Gender preference (female for storytelling)
    if (name.includes('female')) score += 20;

    return score;
}

/**
 * Get best voice recommendation for a language
 */
export async function getRecommendedVoice(language = 'en') {
    const voices = await getAvailableVoices();
    const langVoices = language === 'ar' ? voices.ar : voices.en;

    if (langVoices.length === 0) {
        return null;
    }

    return langVoices[0]; // Already sorted by quality
}

/**
 * Check if device has good Arabic voice support
 */
export async function checkArabicVoiceSupport() {
    const voices = await getAvailableVoices();
    const arabicVoices = voices.ar;

    return {
        hasArabic: arabicVoices.length > 0,
        count: arabicVoices.length,
        hasHighQuality: arabicVoices.some(v => v.quality >= 60),
        recommended: arabicVoices[0] || null,
        allVoices: arabicVoices
    };
}

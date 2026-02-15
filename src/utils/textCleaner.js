/**
 * Clean story text by removing markdown formatting
 * that shouldn't be read aloud by text-to-speech
 */
export function cleanStoryText(text) {
    if (!text) return '';

    console.log('🧹 Cleaning story text, original length:', text.length);

    const cleaned = text
        // Remove horizontal rules (---, ------, ***, etc.)
        .replace(/^[-*_]{3,}$/gm, '')
        // Remove any line with only dashes, stars, or underscores
        .replace(/^\s*[-*_\s]+$/gm, '')
        // Remove markdown headers (###, ##, #)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold markers (**text**)
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        // Remove italic markers (*text* or _text_)
        .replace(/\*([^*\n]+?)\*/g, '$1')
        .replace(/_([^_\n]+?)_/g, '$1')
        // Remove standalone stars and dashes (but preserve single dashes in words)
        .replace(/\*{2,}/g, '')
        .replace(/\*+\s+\*/g, '')
        .replace(/[-–—]{3,}/g, ' ')
        // Remove blockquotes (>)
        .replace(/^>\s+/gm, '')
        // Clean up extra whitespace but preserve paragraph breaks
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+$/gm, '') // trailing spaces
        .replace(/^[ \t]+/gm, '') // leading spaces  
        .trim();

    console.log('✅ Cleaned story text, new length:', cleaned.length);
    console.log('📝 First 200 chars:', cleaned.substring(0, 200));

    return cleaned;
}

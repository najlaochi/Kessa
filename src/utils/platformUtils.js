/**
 * Platform Detection Utility
 * Web-only mode — all methods return web platform values
 */

export const PlatformUtils = {
    /**
     * Check if running on native mobile platform
     * Always false — we are a web-only PWA
     */
    isNative() {
        return false;
    },

    /**
     * Check if running on Android
     */
    isAndroid() {
        return false;
    },

    /**
     * Check if running on iOS
     */
    isIOS() {
        return false;
    },

    /**
     * Check if running in web browser
     */
    isWeb() {
        return true;
    },

    /**
     * Get current platform name
     */
    getPlatform() {
        return 'web';
    }
};

export default PlatformUtils;

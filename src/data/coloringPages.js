/**
 * Coloring pages for the printable book (line art in public/coloring/<scene>-<boy|girl>.svg).
 * Each story gets two scenes; the child in the pictures matches the boy/girl choice.
 * Stories not listed here use DEFAULT_SCENES. Pictures uploaded in admin (illustrations) take priority.
 */
export const STORY_SCENES = {
    '0SjmulPSjpmtdSmPNInL': ['tidy', 'honest'],
    '3o5i6ilqyaFPDcMGZ06y': ['table', 'friends'],
    '4rqiJgIpmQVhg1rhkEOn': ['healthy', 'table'],
    '6cJ9DB6Zej4ZHy7xTHYQ': ['help_mom', 'honest'],
    '86BJnjL0LJCapsteNBLF': ['screen_vs_play', 'friends'],
    'CYmToht2PHvUaZyzLWVV': ['shop', 'honest'],
    'D3ocS3RDcgfbibLLYKQW': ['night', 'honest'],
    'SSl69fEBEc0mZT3GoD0G': ['stranger', 'honest'],
    'SqCirskR5qcRG6jG3TYg': ['homework', 'honest'],
    'VfTwyB2bsz3SVB8HYdq5': ['hygiene', 'healthy'],
    'eyi9CJ8zsZcVcIkE9rtl': ['planet', 'friends'],
    'jPOBx32MINiWyMCgxVij': ['football', 'friends'],
    'mANIM3BN1cC1q3CRvLYh': ['elderly', 'table'],
    'mc22JHacpEHL5IfVOtjZ': ['honest', 'friends'],
    'qIqgUlriv4kJyuDkrgiw': ['homework', 'friends'],
    'rfJpqAIZyvndOt2lIffE': ['friends', 'honest'],
    'vp5RkYTiQ7cYrXf3W2Q2': ['stand_up', 'friends'],
    '0nrxWsauhzvda0rpi8FB': ['homework', 'football'],
    '0ykt2nhIUeRSLVEulgsn': ['night', 'honest'],
    '456LTFIY6huBTPZtjUbe': ['honest', 'friends'],
    '8gcN5zft1GdiqEMzuEid': ['stranger', 'honest'],
    '9uayJODL6XTbnszh1PCl': ['help_mom', 'table'],
    'HH1o0ATJSfsu7w96yMRW': ['elderly', 'friends'],
    'Lt9Qs5HVxpDE0e9i2iaO': ['planet', 'friends'],
    'N2DRhHx7tAUiqvDHStxP': ['stand_up', 'friends'],
    'UqC05IeNE2KA2RJNLGpD': ['table', 'friends'],
    'WSmxiHe6Z0u51Ty4rexJ': ['healthy', 'friends'],
    'YIgxqrQqog8hD5Q5Sxj7': ['planet', 'honest'],
    'disH0mDuoABuFV3O7hgG': ['tidy', 'help_mom'],
    'l1GilIL68DEwevOWYXbf': ['planet', 'friends'],
    'yBXYdWdYlIulIVNDOYkP': ['hygiene', 'healthy'],
    'yKfsWO9QXmiAhvrwN4iT': ['shop', 'friends'],
};

export const DEFAULT_SCENES = ['honest', 'friends'];

export const coloringUrl = (scene, gender) => `/coloring/${scene}-${gender === 'girl' ? 'girl' : 'boy'}.svg`;

export const getColoringScenes = (storyId) => STORY_SCENES[storyId] || DEFAULT_SCENES;

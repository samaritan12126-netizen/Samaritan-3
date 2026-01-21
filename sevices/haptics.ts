
// Haptic Feedback Engine
// Uses the Vibration API for physical response on mobile devices

export const haptics = {
    // Check support
    isSupported: () => typeof navigator !== 'undefined' && 'vibrate' in navigator,

    // --- PATTERNS ---
    
    // Light tap for UI interactions (buttons, toggles)
    impactLight: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    // Medium thud for mode switches
    impactMedium: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    },

    // Heavy thud for critical actions (Execute, Delete)
    impactHeavy: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }
    },

    // Success ripple (Short double tap)
    success: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
        }
    },

    // Error/Alert buzz (Longer vibration)
    error: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 50, 50, 50, 100]);
        }
    },

    // Scanner/Process pattern (Heartbeat)
    scan: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([10, 30, 10, 30]);
        }
    }
};

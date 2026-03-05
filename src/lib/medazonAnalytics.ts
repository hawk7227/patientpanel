// src/lib/medazonAnalytics.ts

type EventProperties = Record<string, any>;

export const MedazonAnalytics = {
  init: () => {
    if (typeof window === 'undefined') return;
    // Basic init logic - mostly handled by useEffects in components in React
    // You can add your mixpanel/GA initialization here
  },

 track: (eventName: string, properties: Record<string, any> = {}) => {
    if (typeof window === 'undefined') return;

    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      properties
    };

    // 1. Log to Console (Debug)
    console.log('[Analytics]', eventName, properties);

    // 2. Send to YOUR new API endpoint
    try {
      // Use navigator.sendBeacon for reliability on page unload, or fetch
      const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics', blob);
    } catch (e) {
      // Fallback to fetch if sendBeacon fails
      fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(eventData)
      }).catch(err => console.error(err));
    }
  },

  // Specific helpers from your original file
  trackStateDetected: (state: string, method: string) => {
    MedazonAnalytics.track('state_detected', { state, method });
  },
  
  trackStateConfirmed: (state: string, auto: boolean) => {
    MedazonAnalytics.track('state_confirmed', { state, was_auto_detected: auto });
  },

  trackChatOpened: (trigger: string) => {
    MedazonAnalytics.track('chat_opened', { trigger });
  },

  trackCTAClick: (name: string, location: string) => {
    MedazonAnalytics.track('cta_click', { cta_name: name, cta_location: location });
  }
};
// Express Checkout Funnel Analytics
// Tracks each step transition for conversion optimization

type FunnelEvent =
  | "checkout_started"
  | "reason_selected"
  | "symptoms_entered"
  | "pharmacy_selected"
  | "visit_type_confirmed"
  | "datetime_selected"
  | "acknowledgment_accepted"
  | "payment_started"
  | "payment_completed"
  | "payment_failed"
  | "demographics_completed"
  | "appointment_created"
  | "step_abandoned";

interface EventData {
  step?: string;
  visitType?: string;
  isReturning?: boolean;
  hasControlled?: boolean;
  error?: string;
  [key: string]: any;
}

export function trackEvent(event: FunnelEvent, data?: EventData) {
  try {
    // Console log for development
    console.log(`[Analytics] ${event}`, data || {});

    // Google Analytics (if available)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", event, {
        event_category: "express_checkout",
        ...data,
      });
    }

    // Future: send to your own analytics endpoint
    // fetch("/api/analytics", { method: "POST", body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }) }).catch(() => {});
  } catch {
    // Analytics should never break the app
  }
}

// ═══════════════════════════════════════════════════════════════
// CAPTURE BOOKING FEE
//
// Called AFTER visit fee hold succeeds (requires_capture).
// Captures the $1.89 booking fee that was held in Elements.
//
// Flow:
//   1. $1.89 hold cleared via Elements
//   2. $189 visit hold confirmed via /api/confirm-visit-hold
//   3. THIS endpoint captures $1.89 → charged to patient
//   4. Proceed to /api/create-appointment
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(request: Request) {
  try {
    const { bookingIntentId } = await request.json();

    if (!bookingIntentId) {
      return NextResponse.json(
        { error: "bookingIntentId is required" },
        { status: 400 }
      );
    }

    const captured = await stripe.paymentIntents.capture(bookingIntentId);
    console.log(`[CaptureBookingFee] ${bookingIntentId} → status: ${captured.status}`);

    if (captured.status === "succeeded") {
      return NextResponse.json({ success: true, bookingIntentId });
    }

    return NextResponse.json(
      { error: `Unexpected status after capture: ${captured.status}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[CaptureBookingFee] Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

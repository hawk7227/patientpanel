// ═══════════════════════════════════════════════════════════════
// CANCEL BOOKING HOLD
//
// Called if visit fee hold fails AFTER $1.89 hold cleared.
// Cancels the $1.89 hold so patient is never charged.
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

    const cancelled = await stripe.paymentIntents.cancel(bookingIntentId);
    console.log(`[CancelBookingHold] ${bookingIntentId} → status: ${cancelled.status}`);

    return NextResponse.json({ success: true, bookingIntentId, status: cancelled.status });
  } catch (err: any) {
    console.error("[CancelBookingHold] Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM VISIT HOLD
//
// Called AFTER $1.89 booking fee hold clears (requires_capture).
// Confirms the $189/$249 visit fee hold server-side using the
// same payment method.
//
// Flow:
//   1. Client confirms bookingIntent ($1.89) via Elements → requires_capture
//   2. Client sends { visitIntentId, paymentMethodId } here
//   3. We confirm visitIntent server-side → $189 held (requires_capture)
//   4. If visit hold SUCCEEDS → client calls /api/capture-booking-fee
//   5. If visit hold FAILS → client calls /api/cancel-booking-hold
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(request: Request) {
  try {
    const { visitIntentId, paymentMethodId } = await request.json();

    if (!visitIntentId || !paymentMethodId) {
      return NextResponse.json(
        { error: "visitIntentId and paymentMethodId are required" },
        { status: 400 }
      );
    }

    // Confirm the visit fee hold using the same payment method
    const visitIntent = await stripe.paymentIntents.confirm(visitIntentId, {
      payment_method: paymentMethodId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://patient.medazonhealth.com"}/success`,
    });

    console.log(`[ConfirmVisitHold] ${visitIntentId} → status: ${visitIntent.status}`);

    // requires_capture = hold placed successfully, funds verified
    if (visitIntent.status === "requires_capture") {
      return NextResponse.json({ success: true, visitIntentId, status: visitIntent.status });
    }

    if (visitIntent.status === "succeeded") {
      return NextResponse.json({ success: true, visitIntentId, status: visitIntent.status });
    }

    // Requires action (3DS etc.)
    if (visitIntent.status === "requires_action") {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: visitIntent.client_secret,
      });
    }

    return NextResponse.json(
      { error: `Unexpected visit intent status: ${visitIntent.status}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[ConfirmVisitHold] Stripe Error:", err.message);
    if (err.type === "StripeCardError") {
      return NextResponse.json(
        { error: err.message, code: err.code, decline_code: err.decline_code },
        { status: 402 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const { visitIntentId, paymentMethodId, confirmAfter3DS } = await request.json();

    if (!visitIntentId) {
      return NextResponse.json(
        { error: "visitIntentId is required" },
        { status: 400 }
      );
    }

    // After 3DS completes on client, verify the intent reached requires_capture
    if (confirmAfter3DS) {
      const verified = await stripe.paymentIntents.retrieve(visitIntentId);
      console.log(`[ConfirmVisitHold] post-3DS verify ${visitIntentId} → ${verified.status}`);
      if (verified.status === "requires_capture" || verified.status === "succeeded") {
        return NextResponse.json({ success: true, visitIntentId, status: verified.status });
      }
      return NextResponse.json(
        { error: `3DS completed but hold not placed. Status: ${verified.status}`, code: "authentication_required" },
        { status: 402 }
      );
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "paymentMethodId is required" },
        { status: 400 }
      );
    }

    // Confirm the visit fee hold using the same payment method
    // use_stripe_sdk: true enables embedded 3DS flow (handleNextAction on client)
    const visitIntent = await stripe.paymentIntents.confirm(visitIntentId, {
      payment_method: paymentMethodId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://patient.medazonhealth.com"}/success`,
      use_stripe_sdk: true,
    });

    console.log(`[ConfirmVisitHold] ${visitIntentId} → status: ${visitIntent.status}`);

    // SUCCESS: hold placed, funds verified
    if (visitIntent.status === "requires_capture") {
      return NextResponse.json({ success: true, visitIntentId, status: visitIntent.status });
    }

    if (visitIntent.status === "succeeded") {
      return NextResponse.json({ success: true, visitIntentId, status: visitIntent.status });
    }

    // 3DS REQUIRED: return clientSecret so client can call stripe.handleNextAction()
    // After client completes 3DS, it must call this endpoint again with confirmAfter3DS: true
    if (visitIntent.status === "requires_action") {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: visitIntent.client_secret,
        visitIntentId,
      }, { status: 200 }); // 200 so client reads body — not a failure, just an action needed
    }

    // requires_payment_method = card declined during confirm
    if (visitIntent.status === "requires_payment_method") {
      return NextResponse.json(
        { error: "Payment declined. Please try a different card.", code: "card_declined" },
        { status: 402 }
      );
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

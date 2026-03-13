// ═══════════════════════════════════════════════════════════════
// CONFIRM BOOKING FEE
//
// Called AFTER the $189 visit hold clears (requires_capture).
// Confirms the $1.89 bookingIntent server-side using the same
// payment method that successfully held the visit fee.
//
// Flow:
//   1. Client confirms visitIntent via PaymentElement → requires_capture
//   2. Client sends { bookingIntentId, paymentMethodId } here
//   3. We confirm bookingIntent server-side → charges $1.89 immediately
//   4. Client proceeds to create-appointment
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(request: Request) {
  try {
    const { bookingIntentId, paymentMethodId } = await request.json();

    if (!bookingIntentId || !paymentMethodId) {
      return NextResponse.json(
        { error: "bookingIntentId and paymentMethodId are required" },
        { status: 400 }
      );
    }

    // Confirm the $1.89 booking fee using the same payment method
    const bookingIntent = await stripe.paymentIntents.confirm(bookingIntentId, {
      payment_method: paymentMethodId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://patient.medazonhealth.com"}/success`,
    });

    console.log(`[ConfirmBooking] ${bookingIntentId} → status: ${bookingIntent.status}`);

    if (bookingIntent.status === "succeeded") {
      return NextResponse.json({ success: true, bookingIntentId });
    }

    // Requires action (3DS etc.) — return client_secret so client can handle
    if (bookingIntent.status === "requires_action") {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: bookingIntent.client_secret,
      });
    }

    return NextResponse.json(
      { error: `Unexpected booking intent status: ${bookingIntent.status}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[ConfirmBooking] Stripe Error:", err.message);
    if (err.type === "StripeCardError") {
      return NextResponse.json(
        { error: err.message, code: err.code, decline_code: err.decline_code },
        { status: 402 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

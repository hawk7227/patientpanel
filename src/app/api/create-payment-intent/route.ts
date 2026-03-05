// ═══════════════════════════════════════════════════════════════
// DUAL PAYMENT INTENT API
//
// Creates TWO Stripe PaymentIntents:
//   1. Booking fee ($1.89) — capture_method: automatic (charges immediately)
//   2. Visit fee ($189/$199/$249) — capture_method: manual (pre-auth hold only)
//
// Visit fee hold verifies funds but does NOT charge the patient.
// Capture triggers (30s threshold):
//   - Video/Phone: both parties connected 30s+
//   - Instant/Refill (no controlled): provider marks completed/rx_sent
//   - Controlled substances: live eval connected 30s+
//   - 7-day expiry if never captured → hold releases automatically
//
// Split: 50/50 via transfer_data to connected account
// Platform: acct_1GTDqCJkJttkJ55H (MEDAZON HEALTH)
// Connected: acct_1S9kcMJ9YkO0Dy3z (Medazonhealth doctor)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const CONNECTED_ACCOUNT_ID = process.env.STRIPE_CONNECTED_ACCOUNT_ID || "acct_1S9kcMJ9YkO0Dy3z";

// Valid visit fee amounts in cents
const VALID_VISIT_AMOUNTS = new Set([
  18900,  // $189 — Instant/Refill business hours
  19900,  // $199 — Video/Phone business hours
  24900,  // $249 — All types after-hours/weekends/holidays
]);

const BOOKING_FEE = 189; // $1.89 in cents

export async function POST(request: Request) {
  try {
    const { amount, visit_amount } = await request.json();

    // ── Legacy support: single amount = old flow ──
    if (!visit_amount && amount) {
      const amountInCents = Math.round(Number(amount));
      if (amountInCents === BOOKING_FEE) {
        // Just booking fee (old express checkout path before dual-intent)
        const pi = await stripe.paymentIntents.create({
          amount: BOOKING_FEE,
          currency: "usd",
          payment_method_types: ['card', 'link'],
          description: "Medazon Health — Booking reserve fee",
          metadata: { type: "booking_fee" },
        });
        console.log(`[Payment] Booking-only intent: ${pi.id} for $1.89`);
        return NextResponse.json({ clientSecret: pi.client_secret, id: pi.id });
      }
      // Legacy full-amount flow (other checkout pages)
      if (VALID_VISIT_AMOUNTS.has(amountInCents)) {
        const split = Math.round(amountInCents * 0.5);
        const pi = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          payment_method_types: ['card', 'link'],
          transfer_data: { amount: split, destination: CONNECTED_ACCOUNT_ID },
          transfer_group: `legacy_${Date.now()}`,
          description: "Medazon Health telehealth visit",
          metadata: { type: "legacy_visit" },
        });
        console.log(`[Payment] Legacy intent: ${pi.id} for $${(amountInCents / 100).toFixed(2)}`);
        return NextResponse.json({ clientSecret: pi.client_secret, id: pi.id });
      }
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // ── Dual intent: booking fee + visit fee pre-auth ──
    const visitAmountCents = Math.round(Number(visit_amount));

    if (!VALID_VISIT_AMOUNTS.has(visitAmountCents)) {
      console.error(`[Payment] Invalid visit amount: ${visitAmountCents}. Valid: ${Array.from(VALID_VISIT_AMOUNTS).join(', ')}`);
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const transferGroup = `booking_${Date.now()}`;

    // 1️⃣ Visit fee — MANUAL capture (pre-auth hold, NOT charged yet)
    //    Created FIRST: if card lacks funds, fail before charging $1.89
    //    50/50 split on capture
    const visitSplit = Math.round(visitAmountCents * 0.5);
    const visitIntent = await stripe.paymentIntents.create({
      amount: visitAmountCents,
      currency: "usd",
      capture_method: "manual",
      payment_method_types: ['card', 'link'],
      transfer_data: {
        amount: visitSplit,
        destination: CONNECTED_ACCOUNT_ID,
      },
      transfer_group: transferGroup,
      description: "Medazon Health — Visit fee (held pending treatment)",
      metadata: {
        type: "visit_fee_hold",
        transfer_group: transferGroup,
        split_amount: String(visitSplit),
      },
    });

    console.log(`[Payment] Visit fee hold: ${visitIntent.id} for $${(visitAmountCents / 100).toFixed(2)} (split: $${(visitSplit / 100).toFixed(2)})`);

    // 2️⃣ Booking fee — AUTOMATIC capture (charges immediately)
    //    50/50 split
    const bookingSplit = Math.round(BOOKING_FEE * 0.5);
    const bookingIntent = await stripe.paymentIntents.create({
      amount: BOOKING_FEE,
      currency: "usd",
      capture_method: "automatic",
      payment_method_types: ['card', 'link'],
      transfer_data: {
        amount: bookingSplit,
        destination: CONNECTED_ACCOUNT_ID,
      },
      transfer_group: transferGroup,
      description: "Medazon Health — Booking reserve fee",
      metadata: {
        type: "booking_fee",
        transfer_group: transferGroup,
        visit_intent_id: visitIntent.id,
      },
    });

    console.log(`[Payment] Booking fee: ${bookingIntent.id} for $1.89 (split: $${(bookingSplit / 100).toFixed(2)})`);

    return NextResponse.json({
      // Client uses bookingSecret for the PaymentElement ($1.89 they pay now)
      clientSecret: bookingIntent.client_secret,
      bookingIntentId: bookingIntent.id,
      // Visit intent info — stored for later capture
      visitIntentId: visitIntent.id,
      visitClientSecret: visitIntent.client_secret,
      transferGroup: transferGroup,
    });
  } catch (err: any) {
    console.error("[Payment] Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

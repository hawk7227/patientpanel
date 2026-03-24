// ═══════════════════════════════════════════════════════════════
// DUAL PAYMENT INTENT API
//
// Stripe Customer:
//   Created or retrieved by email. Both intents attach to the Customer
//   with setup_future_usage: "off_session" so Apple Pay / Google Pay
//   single-use tokens are saved as reusable PaymentMethods.
//   This allows confirm-visit-hold to reuse the same PaymentMethod
//   for the second intent — fixing "PaymentMethod used without Customer".
//
// Flow:
//   1. Elements confirms bookingIntent ($1.89) via Apple/Google Pay
//   2. Server confirms visitIntent ($189) using same paymentMethodId (now reusable)
//   3. Server captures $1.89
//   4. create-appointment
//
// Split: 50/50 via transfer_data to connected account
// Platform: acct_1GTDqCJkJttkJ55H
// Connected: acct_1S9kcMJ9YkO0Dy3z
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const CONNECTED_ACCOUNT_ID =
  process.env.STRIPE_CONNECTED_ACCOUNT_ID || "acct_1S9kcMJ9YkO0Dy3z";

const VALID_VISIT_AMOUNTS = new Set([
  18900, // $189 business hours
  24900, // $249 after-hours
]);

const BOOKING_FEE = 189; // $1.89 in cents

async function getOrCreateCustomer(email: string): Promise<string | null> {
  try {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      console.log(`[Payment] Existing customer: ${existing.data[0].id}`);
      return existing.data[0].id;
    }
    const customer = await stripe.customers.create({ email });
    console.log(`[Payment] Created customer: ${customer.id}`);
    return customer.id;
  } catch (err: any) {
    console.warn("[Payment] Customer lookup failed:", err.message);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, visit_amount, email } = body;

    const customerId = email ? await getOrCreateCustomer(String(email)) : null;
    const customerFields = customerId
      ? { customer: customerId, setup_future_usage: "off_session" as const }
      : {};

    // ── Legacy single-amount flow ────────────────────────────────
    if (!visit_amount && amount) {
      const cents = Math.round(Number(amount));

      if (cents === BOOKING_FEE) {
        const pi = await stripe.paymentIntents.create({
          amount: BOOKING_FEE,
          currency: "usd",
          payment_method_types: ["card"],
          ...customerFields,
          description: "Medazon Health — Booking reserve fee",
          metadata: { type: "booking_fee" },
        });
        console.log(`[Payment] Booking-only: ${pi.id}`);
        return NextResponse.json({ clientSecret: pi.client_secret, id: pi.id });
      }

      if (VALID_VISIT_AMOUNTS.has(cents)) {
        const split = Math.round(cents * 0.5);
        const pi = await stripe.paymentIntents.create({
          amount: cents,
          currency: "usd",
          payment_method_types: ["card"],
          ...customerFields,
          transfer_data: { amount: split, destination: CONNECTED_ACCOUNT_ID },
          transfer_group: `legacy_${Date.now()}`,
          description: "Medazon Health telehealth visit",
          metadata: { type: "legacy_visit" },
        });
        console.log(`[Payment] Legacy: ${pi.id} $${(cents / 100).toFixed(2)}`);
        return NextResponse.json({ clientSecret: pi.client_secret, id: pi.id });
      }

      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // ── Dual intent ──────────────────────────────────────────────
    const visitCents = Math.round(Number(visit_amount));

    if (!VALID_VISIT_AMOUNTS.has(visitCents)) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const transferGroup = `booking_${Date.now()}`;
    const visitSplit = Math.round(visitCents * 0.5);
    const bookingSplit = Math.round(BOOKING_FEE * 0.5);

    // 1. Visit fee hold — manual capture, NOT charged yet
    const visitIntent = await stripe.paymentIntents.create({
      amount: visitCents,
      currency: "usd",
      capture_method: "manual",
      payment_method_types: ["card"],
      ...customerFields,
      transfer_data: { amount: visitSplit, destination: CONNECTED_ACCOUNT_ID },
      transfer_group: transferGroup,
      description: "Medazon Health — Visit fee (held pending treatment)",
      metadata: {
        type: "visit_fee_hold",
        transfer_group: transferGroup,
        split_amount: String(visitSplit),
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      },
    });
    console.log(`[Payment] Visit hold: ${visitIntent.id} $${(visitCents / 100).toFixed(2)} customer:${customerId || "none"}`);

    // 2. Booking fee hold — manual capture, same Customer
    const bookingIntent = await stripe.paymentIntents.create({
      amount: BOOKING_FEE,
      currency: "usd",
      capture_method: "manual",
      payment_method_types: ["card"],
      ...customerFields,
      transfer_data: { amount: bookingSplit, destination: CONNECTED_ACCOUNT_ID },
      transfer_group: transferGroup,
      description: "Medazon Health — Booking reserve fee",
      metadata: {
        type: "booking_fee",
        transfer_group: transferGroup,
        visit_intent_id: visitIntent.id,
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      },
    });
    console.log(`[Payment] Booking hold: ${bookingIntent.id} $1.89 customer:${customerId || "none"}`);

    return NextResponse.json({
      clientSecret: bookingIntent.client_secret,
      bookingIntentId: bookingIntent.id,
      visitIntentId: visitIntent.id,
      transferGroup: transferGroup,
      customerId: customerId || null,
    });

  } catch (err: any) {
    console.error("[Payment] Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

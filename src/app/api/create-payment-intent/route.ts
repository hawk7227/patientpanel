// ═══════════════════════════════════════════════════════════════
// PAYMENT INTENT API — Creates Stripe PaymentIntent
//
// FIXED: Amount is received in CENTS directly (18900 = $189.00)
// Server validates against whitelist of valid amounts
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

// Valid amounts in cents — prevents frontend tampering
const VALID_AMOUNTS = new Set([
  18900,  // $189 — Instant/Refill business hours
  19900,  // $199 — Video/Phone business hours
  24900,  // $249 — All types after-hours/weekends/holidays
]);

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    // Amount is already in cents — DO NOT multiply by 100
    const amountInCents = Math.round(Number(amount));

    // Server-side validation
    if (!amountInCents || amountInCents < 100) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!VALID_AMOUNTS.has(amountInCents)) {
      console.error(`[Payment] Invalid amount: ${amountInCents} cents. Valid: ${Array.from(VALID_AMOUNTS).join(', ')}`);
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const pi = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method_types: ['card'],
      transfer_group: `pi_split_${Date.now()}`,
      description: "Medazon Health telehealth visit",
    });

    console.log(`[Payment] Intent created: ${pi.id} for $${(amountInCents / 100).toFixed(2)}`);

    return NextResponse.json({
      clientSecret: pi.client_secret,
      id: pi.id,
    });
  } catch (err: any) {
    console.error("[Payment] Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

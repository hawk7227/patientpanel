// ═══════════════════════════════════════════════════════════════
// STRIPE CHECKOUT SESSION API
//
// Replaces inline PaymentElement with Stripe-hosted checkout.
// Apple Pay, Google Pay, Cash App Pay work automatically on
// Stripe's domain — no domain verification needed.
//
// Dual-intent preserved:
//   1. Checkout Session charges $1.89 booking fee (automatic)
//   2. Visit fee hold created separately (manual capture)
//
// All appointment data passed via metadata → retrieved on success.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const CONNECTED_ACCOUNT_ID = process.env.STRIPE_CONNECTED_ACCOUNT_ID || "acct_1S9kcMJ9YkO0Dy3z";

const VALID_VISIT_AMOUNTS = new Set([
  18900, // $189
  19900, // $199
  24900, // $249
]);

const BOOKING_FEE = 189; // $1.89 in cents

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      visit_amount,
      // Appointment data — stored in metadata for post-payment creation
      patient_email,
      patient_first_name,
      patient_last_name,
      patient_phone,
      patient_dob,
      patient_address,
      patient_id,
      reason,
      chief_complaint,
      visit_type,
      appointment_date,
      appointment_time,
      pharmacy,
      pharmacy_address,
      selected_medications,
      symptoms_text,
      browser_info,
      is_returning_patient,
    } = body;

    const visitAmountCents = Math.round(Number(visit_amount));

    if (!VALID_VISIT_AMOUNTS.has(visitAmountCents)) {
      console.error(`[Checkout] Invalid visit amount: ${visitAmountCents}`);
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const transferGroup = `booking_${Date.now()}`;

    // 1️⃣ Visit fee — MANUAL capture (pre-auth hold, NOT charged yet)
    const visitSplit = Math.round(visitAmountCents * 0.5);
    const visitIntent = await stripe.paymentIntents.create({
      amount: visitAmountCents,
      currency: "usd",
      capture_method: "manual",
      payment_method_types: ["card"],
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

    console.log(`[Checkout] Visit fee hold: ${visitIntent.id} for $${(visitAmountCents / 100).toFixed(2)}`);

    // 2️⃣ Checkout Session for $1.89 booking fee
    const bookingSplit = Math.round(BOOKING_FEE * 0.5);

    // Build appointment metadata (Stripe metadata values must be strings, max 500 chars)
    // Stripe metadata: string values only, max 500 chars, no newlines
    const sanitize = (v: any): string => String(v || "").replace(/[\n\r]/g, " ").slice(0, 500);
    const appointmentMeta: Record<string, string> = {
      type: "booking_fee",
      transfer_group: transferGroup,
      visit_intent_id: visitIntent.id,
      patient_email: sanitize(patient_email),
      patient_first_name: sanitize(patient_first_name),
      patient_last_name: sanitize(patient_last_name),
      patient_phone: sanitize(patient_phone),
      patient_dob: sanitize(patient_dob),
      patient_address: sanitize(patient_address),
      patient_id: sanitize(patient_id),
      reason: sanitize(reason),
      chief_complaint: sanitize(chief_complaint),
      visit_type: sanitize(visit_type),
      appointment_date: sanitize(appointment_date),
      appointment_time: sanitize(appointment_time),
      pharmacy: sanitize(pharmacy),
      pharmacy_address: sanitize(pharmacy_address),
      selected_medications: sanitize(selected_medications),
      symptoms_text: sanitize(symptoms_text),
      is_returning_patient: is_returning_patient ? "true" : "false",
    };

    const origin = request.headers.get("origin") || "https://patient.medazonhealth.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // payment_method_types omitted — Stripe auto-enables all configured methods
      // including Apple Pay, Google Pay, Card, Cash App Pay
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Medazon Health — Booking Reserve Fee",
              description: "Secures your provider. Visit fee collected separately after provider review.",
            },
            unit_amount: BOOKING_FEE,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          amount: bookingSplit,
          destination: CONNECTED_ACCOUNT_ID,
        },
        transfer_group: transferGroup,
        metadata: appointmentMeta,
      },
      customer_email: patient_email && patient_email.includes("@") ? patient_email : undefined,
      metadata: appointmentMeta,
      success_url: `${origin}/express-checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/express-checkout?cancelled=true`,
    });

    console.log(`[Checkout] Session created: ${session.id}, URL: ${session.url}`);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      visitIntentId: visitIntent.id,
      transferGroup,
    });
  } catch (err: any) {
    console.error("[Checkout] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

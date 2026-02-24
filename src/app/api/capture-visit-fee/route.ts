// ═══════════════════════════════════════════════════════════════
// CAPTURE VISIT FEE API
//
// Called when visit triggers capture:
//   - Video/Phone: both parties connected 30s+
//   - Instant/Refill: provider marks completed/rx_sent
//   - Controlled + live eval: call connected 30s+
//
// Also supports:
//   - Partial capture (less than authorized amount)
//   - Cancel/release hold (provider declines)
//
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(request: Request) {
  try {
    const { visit_intent_id, action, amount_to_capture, appointment_id } = await request.json();

    if (!visit_intent_id) {
      return NextResponse.json({ error: "Missing visit_intent_id" }, { status: 400 });
    }

    // Retrieve the intent to check its status
    const intent = await stripe.paymentIntents.retrieve(visit_intent_id);

    if (action === "cancel" || action === "release") {
      // ── Release the hold — provider declined or can't treat ──
      if (intent.status === "requires_capture") {
        const cancelled = await stripe.paymentIntents.cancel(visit_intent_id);
        console.log(`[Capture] Released hold: ${visit_intent_id} — $${(intent.amount / 100).toFixed(2)}`);

        // Update Supabase
        if (appointment_id) {
          const supabase = createServerClient();
          await supabase
            .from("appointments")
            .update({ payment_status: "hold_released", visit_fee_status: "released" })
            .eq("id", appointment_id);
        }

        return NextResponse.json({
          success: true,
          action: "released",
          intentId: visit_intent_id,
          status: cancelled.status,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `Cannot release — intent status is ${intent.status}`,
        }, { status: 400 });
      }
    }

    // ── Capture the hold — visit happened ──
    if (intent.status !== "requires_capture") {
      return NextResponse.json({
        success: false,
        error: `Cannot capture — intent status is ${intent.status} (expected requires_capture)`,
      }, { status: 400 });
    }

    // Support partial capture (capture less than authorized)
    const captureAmount = amount_to_capture
      ? Math.round(Number(amount_to_capture))
      : intent.amount; // full capture by default

    if (captureAmount > intent.amount) {
      return NextResponse.json({
        error: `Cannot capture $${(captureAmount / 100).toFixed(2)} — authorized amount is $${(intent.amount / 100).toFixed(2)}`,
      }, { status: 400 });
    }

    const captured = await stripe.paymentIntents.capture(visit_intent_id, {
      amount_to_capture: captureAmount,
    });

    console.log(`[Capture] Visit fee captured: ${visit_intent_id} — $${(captureAmount / 100).toFixed(2)} of $${(intent.amount / 100).toFixed(2)} authorized`);

    // Update Supabase
    if (appointment_id) {
      const supabase = createServerClient();
      await supabase
        .from("appointments")
        .update({
          payment_status: "captured",
          visit_fee_status: "captured",
          visit_fee_captured_at: new Date().toISOString(),
          visit_fee_captured_amount: captureAmount,
        })
        .eq("id", appointment_id);
    }

    return NextResponse.json({
      success: true,
      action: "captured",
      intentId: visit_intent_id,
      capturedAmount: captureAmount,
      status: captured.status,
    });
  } catch (err: any) {
    console.error("[Capture] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

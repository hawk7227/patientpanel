import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", errorMessage);
      return NextResponse.json(
        { error: `Webhook Error: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const supabase = createServerClient();

      // Check if appointment already exists
      const { data: existingAppointment } = await supabase
        .from("appointments")
        .select("id, payment_status")
        .eq("payment_intent_id", paymentIntent.id)
        .single();

      if (existingAppointment) {
        // Update payment status if needed
        if (existingAppointment.payment_status !== "captured") {
          await supabase
            .from("appointments")
            .update({ payment_status: "captured" })
            .eq("id", existingAppointment.id);
        }

        // Update payment record
        await supabase
          .from("payment_records")
          .update({ status: "captured" })
          .eq("payment_intent_id", paymentIntent.id);
      } else {
        // If appointment doesn't exist yet, it will be created when user visits success page
        // This webhook ensures payment status is tracked
        console.log(`Payment succeeded for intent ${paymentIntent.id}, but no appointment found yet`);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      const supabase = createServerClient();

      // Update appointment and payment record status
      await supabase
        .from("appointments")
        .update({ payment_status: "cancelled" })
        .eq("payment_intent_id", paymentIntent.id);

      await supabase
        .from("payment_records")
        .update({ status: "cancelled" })
        .eq("payment_intent_id", paymentIntent.id);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed", details: errorMessage },
      { status: 500 }
    );
  }
}


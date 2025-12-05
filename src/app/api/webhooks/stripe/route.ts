
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",  // stable Stripe version
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID!;

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Handle PaymentIntent success (update DB)
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await supabase
      .from("appointments")
      .update({ payment_status: "captured" })
      .eq("payment_intent_id", pi.id);

    await supabase
      .from("payment_records")
      .update({ status: "captured" })
      .eq("payment_intent_id", pi.id);

    console.log("✅ Updated DB for PaymentIntent:", pi.id);
  }

  // 2. Handle Charge (split payout) — when fee info is available
  if (event.type === "charge.succeeded" || event.type === "charge.updated") {
    const charge = event.data.object as Stripe.Charge;

    // Must have balance_transaction
    if (!charge.balance_transaction) {
      console.log("⚠ No balance_transaction yet for charge:", charge.id);
      return NextResponse.json({ received: true });
    }

    try {
      const bal = await stripe.balanceTransactions.retrieve(
        charge.balance_transaction as string
      );
      const net = bal.net;       // in cents
      const split = Math.round(net * 0.5);

      console.log(
        `💵 Charge ${charge.id}: gross=$${charge.amount / 100}, fee=$${(bal.fee) / 100}, net=$${net / 100}, split=$${split / 100}`
      );

      if (split <= 0) {
        console.warn("⚠ Split amount zero or negative — skipping transfer.");
        return NextResponse.json({ received: true });
      }

      // Prevent duplicate transfers
      const existing = await stripe.transfers.list({
        limit: 1,
        transfer_group: charge.payment_intent as string,
      });

      if (existing.data.length > 0) {
        console.log("⚠ Transfer already exists — skipping duplicate");
      } else {
        const transfer = await stripe.transfers.create({
          amount: split,
          currency: bal.currency,
          destination: connectedAccountId,
          transfer_group: charge.payment_intent as string,
          metadata: {
            payment_intent: charge.payment_intent as string,
            charge_id: charge.id,
          },
        });
        console.log("🚀 Transfer created:", transfer.id, "Amount:", split / 100);
      }
    } catch (err: any) {
      console.error("❌ Error during transfer creation:", err.message);
    }
  }

  // 3. Handle failed PaymentIntent
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    await supabase
      .from("appointments")
      .update({ payment_status: "cancelled" })
      .eq("payment_intent_id", pi.id);

    await supabase
      .from("payment_records")
      .update({ status: "cancelled" })
      .eq("payment_intent_id", pi.id);

    console.log("❌ PaymentIntent failed:", pi.id);
  }

  return NextResponse.json({ received: true });
}
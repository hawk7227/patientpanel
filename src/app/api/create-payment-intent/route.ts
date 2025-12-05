// app/api/create-payment-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export async function POST(request: Request) {
  try {
    const { amount } = await request.json();
    const amountCents = Math.round(amount * 100);

    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      transfer_group: `pi_split_${Date.now()}`,
      description: "Split payout after Stripe fee",
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      id: pi.id,
    });
  } catch (err: any) {
    console.error("Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
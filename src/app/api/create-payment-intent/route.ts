import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-11-17.clover", // Use latest API version or the one matching your account
});

export async function POST(request: Request) {
    try {
        const { items } = await request.json();

        // Create a PaymentIntent with the order amount and currency
        // Only allow card payments
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 18500, // $185.00
            currency: "usd",
            payment_method_types: ['card'],
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Internal Error:", error);
        return NextResponse.json(
            { error: `Internal Server Error: ${errorMessage}` },
            { status: 500 }
        );
    }
}

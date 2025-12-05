// import { NextResponse } from "next/server";
// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//     apiVersion: "2025-11-17.clover", // Use latest API version or the one matching your account
// });

// export async function POST(request: Request) {
//     try {
//         const { items } = await request.json();

//         // Create a PaymentIntent with the order amount and currency
//         // Only allow card payments
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: 18500, // $185.00
//             currency: "usd",
//             payment_method_types: ['card'],
//         });

//         return NextResponse.json({
//             clientSecret: paymentIntent.client_secret,
//         });
//     } catch (error: unknown) {
//         const errorMessage = error instanceof Error ? error.message : "Unknown error";
//         console.error("Internal Error:", error);
//         return NextResponse.json(
//             { error: `Internal Server Error: ${errorMessage}` },
//             { status: 500 }
//         );
//     }
// }


// import { NextResponse } from "next/server";
// import Stripe from "stripe";

// // Runtime check for STRIPE_SECRET_KEY
// const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// if (!stripeSecretKey) {
//   throw new Error("STRIPE_SECRET_KEY is not set in environment variables!");
// }

// const stripe = new Stripe(stripeSecretKey, {
//   apiVersion: "2023-10-16",
// });

// // Runtime check for STRIPE_CONNECTED_ACCOUNT_ID
// const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID;
// if (!connectedAccountId) {
//   throw new Error("STRIPE_CONNECTED_ACCOUNT_ID is not set in environment variables!");
// }

// export async function POST(request: Request) {
//   try {
//     const { amount } = await request.json();
//     const amountCents = Math.round(amount * 100);

//     const splitAmount = Math.round(amountCents * 0.5);

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amountCents,
//       currency: "usd",
//       description: "50/50 split payment",
//       automatic_payment_methods: { enabled: true },
//       transfer_data: {
//         destination: connectedAccountId,
//         amount: splitAmount,
//       },
//     });

//     return NextResponse.json({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error: any) {
//     console.error("Stripe Error:", error);
//     return NextResponse.json(
//       { error: error.message ?? "Something went wrong" },
//       { status: 500 }
//     );
//   }
// }



// app/api/create-payment/route.ts
// import { NextResponse } from "next/server";
// import Stripe from "stripe";

// const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
// const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-11-17.clover" });

// export async function POST(request: Request) {
//   try {
//     const { amount } = await request.json(); // amount in dollars
//     const amountCents = Math.round(amount * 100);

//     // Create PaymentIntent without transfer amount
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amountCents,
//       currency: "usd",
//       automatic_payment_methods: { enabled: true },
//       description: "Payment to be split after fees",
//     });

//     return NextResponse.json({
//       clientSecret: paymentIntent.client_secret,
//       id: paymentIntent.id,
//     });
//   } catch (error: any) {
//     console.error("Stripe Error:", error);
//     return NextResponse.json(
//       { error: error.message ?? "Something went wrong" },
//       { status: 500 }
//     );
//   }
// }


// app/api/create-payment-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
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

// // import { NextResponse } from "next/server";
// // import { headers } from "next/headers";
// // import Stripe from "stripe";
// // import { createServerClient } from "@/lib/supabase";

// // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
// //   apiVersion: "2025-11-17.clover",
// // });

// // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// // export async function POST(request: Request) {
// //   try {
// //     const body = await request.text();
// //     const headersList = await headers();
// //     const signature = headersList.get("stripe-signature");

// //     if (!signature) {
// //       return NextResponse.json(
// //         { error: "No signature provided" },
// //         { status: 400 }
// //       );
// //     }

// //     let event: Stripe.Event;

// //     try {
// //       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
// //     } catch (err: unknown) {
// //       const errorMessage = err instanceof Error ? err.message : "Unknown error";
// //       console.error("Webhook signature verification failed:", errorMessage);
// //       return NextResponse.json(
// //         { error: `Webhook Error: ${errorMessage}` },
// //         { status: 400 }
// //       );
// //     }

// //     // Handle the event
// //     if (event.type === "payment_intent.succeeded") {
// //       const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
// //       const supabase = createServerClient();

// //       // Check if appointment already exists
// //       const { data: existingAppointment } = await supabase
// //         .from("appointments")
// //         .select("id, payment_status")
// //         .eq("payment_intent_id", paymentIntent.id)
// //         .single();

// //       if (existingAppointment) {
// //         // Update payment status if needed
// //         if (existingAppointment.payment_status !== "captured") {
// //           await supabase
// //             .from("appointments")
// //             .update({ payment_status: "captured" })
// //             .eq("id", existingAppointment.id);
// //         }

// //         // Update payment record
// //         await supabase
// //           .from("payment_records")
// //           .update({ status: "captured" })
// //           .eq("payment_intent_id", paymentIntent.id);
// //       } else {
// //         // If appointment doesn't exist yet, it will be created when user visits success page
// //         // This webhook ensures payment status is tracked
// //         console.log(`Payment succeeded for intent ${paymentIntent.id}, but no appointment found yet`);
// //       }
// //     } else if (event.type === "payment_intent.payment_failed") {
// //       const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
// //       const supabase = createServerClient();

// //       // Update appointment and payment record status
// //       await supabase
// //         .from("appointments")
// //         .update({ payment_status: "cancelled" })
// //         .eq("payment_intent_id", paymentIntent.id);

// //       await supabase
// //         .from("payment_records")
// //         .update({ status: "cancelled" })
// //         .eq("payment_intent_id", paymentIntent.id);
// //     }

// //     return NextResponse.json({ received: true });
// //   } catch (error: unknown) {
// //     const errorMessage = error instanceof Error ? error.message : "Unknown error";
// //     console.error("Webhook error:", error);
// //     return NextResponse.json(
// //       { error: "Webhook handler failed", details: errorMessage },
// //       { status: 500 }
// //     );
// //   }
// // }




// import { NextResponse } from "next/server";
// import { headers } from "next/headers";
// import Stripe from "stripe";
// import { createServerClient } from "@/lib/supabase";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-11-17.clover",
// });

// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
// const connectedAccountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID!;

// export async function POST(request: Request) {
//   try {
//     const body = await request.text();
//     const headersList = await headers();
//     const signature = headersList.get("stripe-signature");

//     if (!signature) {
//       return NextResponse.json({ error: "No signature provided" }, { status: 400 });
//     }

//     let event: Stripe.Event;

//     try {
//       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
//     } catch (err: unknown) {
//       const errorMessage = err instanceof Error ? err.message : "Unknown error";
//       console.error("Webhook signature verification failed:", errorMessage);
//       return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
//     }

//     // Handle events
//     if (event.type === "payment_intent.succeeded") {
//       // Tell TS that charges exist on the PaymentIntent
//       const paymentIntent = event.data.object as Stripe.PaymentIntent & {
//         charges: { data: Stripe.Charge[] };
//       };

//       const supabase = createServerClient();

//       // 1️⃣ Update Supabase records
//       const { data: existingAppointment } = await supabase
//         .from("appointments")
//         .select("id, payment_status")
//         .eq("payment_intent_id", paymentIntent.id)
//         .single();

//       if (existingAppointment) {
//         if (existingAppointment.payment_status !== "captured") {
//           await supabase
//             .from("appointments")
//             .update({ payment_status: "captured" })
//             .eq("id", existingAppointment.id);
//         }

//         await supabase
//           .from("payment_records")
//           .update({ status: "captured" })
//           .eq("payment_intent_id", paymentIntent.id);
//       } else {
//         console.log(`Payment succeeded for intent ${paymentIntent.id}, but no appointment found yet`);
//       }

//       // 2️⃣ Split net amount to connected account
//       try {
//         const charge = paymentIntent.charges.data[0];
//         if (!charge) throw new Error("Charge not found in PaymentIntent");

//         const balanceTransaction = await stripe.balanceTransactions.retrieve(
//           charge.balance_transaction as string
//         );

//         const netAmount = balanceTransaction.net; // in cents
//         const splitAmount = Math.round(netAmount * 0.5);

//         if (splitAmount > 0) {
//           await stripe.transfers.create({
//             amount: splitAmount,
//             currency: "usd",
//             destination: connectedAccountId,
//             source_transaction: charge.id,
//           });

//           console.log(`Transferred ${splitAmount / 100} USD to connected account`);
//         }
//       } catch (transferErr) {
//         console.error("Transfer failed:", transferErr);
//       }

//     } else if (event.type === "payment_intent.payment_failed") {
//       const paymentIntent = event.data.object as Stripe.PaymentIntent;
//       const supabase = createServerClient();

//       await supabase
//         .from("appointments")
//         .update({ payment_status: "cancelled" })
//         .eq("payment_intent_id", paymentIntent.id);

//       await supabase
//         .from("payment_records")
//         .update({ status: "cancelled" })
//         .eq("payment_intent_id", paymentIntent.id);
//     }

//     return NextResponse.json({ received: true });
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : "Unknown error";
//     console.error("Webhook error:", error);
//     return NextResponse.json(
//       { error: "Webhook handler failed", details: errorMessage },
//       { status: 500 }
//     );
//   }
// }


// app/api/webhooks/stripe/route.ts
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




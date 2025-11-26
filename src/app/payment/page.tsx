"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "@/components/CheckoutForm";
import { ShieldCheck } from "lucide-react";

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "consultation-fee" }] }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#00cba9',
      colorBackground: '#11161c',
      colorText: '#ffffff',
      colorDanger: '#ef4444',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="absolute top-4 sm:top-6 w-full flex justify-between px-4 sm:px-6 z-10">
         <div className="w-full text-center text-white font-bold text-sm sm:text-lg tracking-wide">
            Medazon Health <span className="text-primary-orange">+</span> Concierge
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-20 sm:pt-24 p-3 sm:p-4 w-full max-w-2xl mx-auto z-0 gap-3 sm:gap-4">
        
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-[#0d1218] border border-white/5 rounded-xl p-4 sm:p-6 lg:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Payment Details</h2>
              <div className="flex items-center gap-2 text-primary-teal bg-primary-teal/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit">
                <ShieldCheck size={12} className="sm:w-3.5 sm:h-3.5" />
                Secure Checkout
              </div>
            </div>

            <div className="mb-6 sm:mb-8 bg-[#11161c] rounded-xl p-3 sm:p-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm sm:text-base">Consultation Fee</span>
                <span className="text-white font-bold text-sm sm:text-base">$185.00</span>
              </div>
              <div className="h-px bg-white/10 my-2 sm:my-3" />
              <div className="flex justify-between items-center text-base sm:text-lg">
                <span className="text-white font-bold">Total</span>
                <span className="text-primary-teal font-bold">$185.00</span>
              </div>
            </div>

            {clientSecret ? (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm />
              </Elements>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-500 space-y-3 sm:space-y-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary-teal border-t-transparent rounded-full animate-spin" />
                <p className="text-sm sm:text-base">Initializing secure payment...</p>
                {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                  <p className="text-red-400 text-xs sm:text-sm text-center px-4">
                    Stripe Publishable Key is missing. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

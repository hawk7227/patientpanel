"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Check, Lock } from "lucide-react";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
      },
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message || "An error occurred.");
    } else {
      setMessage("An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="bg-[#11161c] border border-white/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 text-white">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-teal/10 flex items-center justify-center text-primary-teal shrink-0">
            <Lock size={16} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">Secure Payment</h3>
            <p className="text-xs text-gray-400">Encrypted and secure transaction</p>
          </div>
        </div>
        
        <PaymentElement 
          options={{
            layout: "tabs",
            wallets: {
              applePay: 'never',
              googlePay: 'never',
            },
          }} 
        />
      </div>

      {message && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
          {message}
        </div>
      )}

      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-white text-black font-bold py-3 sm:py-4 rounded-lg hover:bg-gray-200 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        {isLoading ? (
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : (
          <>
            <span>Pay Now</span>
            <Lock size={14} className="sm:w-4 sm:h-4" />
          </>
        )}
      </button>
    </form>
  );
}

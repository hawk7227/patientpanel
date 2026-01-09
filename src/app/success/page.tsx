"use client";

import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const payment_intent = searchParams.get("payment_intent");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const createAppointment = async () => {
      if (!payment_intent) {
        setStatus("error");
        setErrorMessage("Payment intent not found");
        return;
      }

      // Check if we already have the access token in sessionStorage (prevents duplicate calls on reload)
      const storedToken = sessionStorage.getItem(`appointment_token_${payment_intent}`);
      if (storedToken) {
        setAccessToken(storedToken);
        setStatus("success");
        // Auto-redirect to appointment page
        router.push(`/appointment/${storedToken}`);
        return;
      }

      try {
        // Get appointment data from sessionStorage
        const appointmentDataStr = sessionStorage.getItem("appointmentData");
        const appointmentData = appointmentDataStr ? JSON.parse(appointmentDataStr) : null;

        // Call API to create appointment (or get existing one)
        const response = await fetch("/api/create-appointment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_intent_id: payment_intent,
            appointmentData: appointmentData,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create appointment");
        }

        // Store token in sessionStorage to prevent duplicate calls
        if (result.accessToken) {
          sessionStorage.setItem(`appointment_token_${payment_intent}`, result.accessToken);
          setAccessToken(result.accessToken);
          // Auto-redirect to appointment page
          router.push(`/appointment/${result.accessToken}`);
        }
        
        setStatus("success");
        
        // Clear appointment data after successful creation
        sessionStorage.removeItem("appointmentData");
      } catch (error) {
        console.error("Error creating appointment:", error);
        const message = error instanceof Error ? error.message : "Failed to create appointment. Please contact support.";
        setStatus("error");
        setErrorMessage(message);
      }
    };

    createAppointment();
  }, [payment_intent, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-primary-teal/20 flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-primary-teal border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Processing...</h2>
          <p className="text-gray-400">
            Confirming your payment and creating your appointment.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-400">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-400 mb-8">
            {errorMessage || "Something went wrong. Please contact support."}
          </p>
          
          <Link href="/" className="inline-block bg-white text-black font-bold py-3 px-12 rounded-lg hover:bg-gray-200 transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
      <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-full bg-primary-teal flex items-center justify-center mx-auto mb-6 text-black shadow-[0_0_30px_rgba(0,203,169,0.4)]">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Payment Successful!</h2>
        <p className="text-gray-400 mb-8">
          Thank you for your payment. Your consultation has been confirmed.
        </p>
        
        {accessToken ? (
          <Link 
            href={`/appointment/${accessToken}`}
            className="inline-block bg-primary-teal text-black font-bold py-3 px-12 rounded-lg hover:bg-primary-teal/90 transition-colors shadow-lg"
          >
            View Appointment Details
          </Link>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            Loading appointment details...
          </p>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

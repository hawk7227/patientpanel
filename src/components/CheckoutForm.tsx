"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  streetAddress: string;
  postalCode: string;
}

interface CheckoutFormProps {
  formData: FormData;
  acceptedTerms: boolean;
  onTermsChange: (accepted: boolean) => void;
  isFormValid: () => boolean | null;
  convertDateToISO: (dateStr: string) => string;
  onSuccess?: () => void;
}

export default function CheckoutForm({ 
  formData, 
  acceptedTerms,
  onTermsChange,
  isFormValid,
  convertDateToISO,
  onSuccess
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate patient form before payment
    if (!isFormValid()) {
      setMessage("Please fill in all required patient information fields.");
      return;
    }

    if (!acceptedTerms) {
      setMessage("Please accept the terms to continue.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Create or update patient record
      const storedData = sessionStorage.getItem('appointmentData');
      let patientId: string | null = null;
      
      if (storedData) {
        try {
          const appointmentData = JSON.parse(storedData);
          if (appointmentData.skipIntake && appointmentData.patientId) {
            patientId = appointmentData.patientId;
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (!patientId) {
        const isoDateOfBirth = convertDateToISO(formData.dateOfBirth);
        
        let pharmacy = "";
        let pharmacyAddress = "";
        if (storedData) {
          try {
            const appointmentData = JSON.parse(storedData);
            pharmacy = appointmentData.pharmacy || "";
            pharmacyAddress = appointmentData.pharmacyAddress || "";
          } catch {
            // Ignore
          }
        }
        
        const response = await fetch('/api/check-create-patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            dateOfBirth: isoDateOfBirth,
            address: formData.streetAddress,
            pharmacy: pharmacy,
            pharmacyAddress: pharmacyAddress,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to process patient information');
        }

        patientId = result.patientId;
      }

      // Update session storage with patient ID
      const isoDateOfBirth = convertDateToISO(formData.dateOfBirth);
      const storedAppointmentData = storedData ? JSON.parse(storedData) : {};
      const updatedAppointmentData = {
        ...storedAppointmentData,
        ...formData,
        dateOfBirth: isoDateOfBirth,
        patientId: patientId,
      };
      sessionStorage.setItem('appointmentData', JSON.stringify(updatedAppointmentData));

      // Process payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/success`,
          payment_method_data: {
            billing_details: {
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              phone: formData.phone,
            },
          },
        },
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message || "An error occurred.");
        } else {
          setMessage("An unexpected error occurred.");
        }
        setIsLoading(false);
        return;
      }

      // Payment successful - create appointment
      if (paymentIntent && paymentIntent.status === "succeeded") {
        try {
          const appointmentDataStr = sessionStorage.getItem("appointmentData");
          const appointmentData = appointmentDataStr ? JSON.parse(appointmentDataStr) : {};

          const response = await fetch("/api/create-appointment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payment_intent_id: paymentIntent.id,
              appointmentData: {
                ...appointmentData,
                ...formData,
                dateOfBirth: isoDateOfBirth,
                patientId: patientId,
              },
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Failed to create appointment");
          }

          // Store access token if provided
          if (result.accessToken) {
            sessionStorage.setItem(`appointment_token_${paymentIntent.id}`, result.accessToken);
          }

          // Call success callback
          if (onSuccess) {
            onSuccess();
          }
        } catch (appointmentError) {
          console.error("Error creating appointment:", appointmentError);
          setMessage(appointmentError instanceof Error ? appointmentError.message : "Payment succeeded but failed to create appointment. Please contact support.");
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to process payment. Please try again.');
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
            paymentMethodOrder: ['card'],
            wallets: {
              applePay: 'never',
              googlePay: 'never',
            },
            fields: {
              billingDetails: {
                name: 'never',
                email: 'never',
                phone: 'never',
              }
            }
          }} 
        />
      </div>

      {message && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
          {message}
        </div>
      )}

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="paymentTerms"
          checked={acceptedTerms}
          onChange={(e) => onTermsChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-primary-teal/50 bg-[#0d1218] text-primary-teal focus:ring-primary-teal focus:ring-offset-0"
        />
        <label htmlFor="paymentTerms" className="text-xs text-gray-400 leading-relaxed text-justify">
          By confirming, I agree to the <span className="text-primary-teal">Terms of Service</span>, <span className="text-primary-teal">Privacy Policy</span>, and <span className="text-primary-teal">Cancellation Policy</span>. By requesting a provider appointment, I acknowledge that my card will not be charged until a provider accepts my appointment request. Once accepted, I authorize a one-time charge of $189.00 (flat, non-refundable) for this visit.
        </label>
      </div>

      <button
        disabled={isLoading || !stripe || !elements || !isFormValid()}
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

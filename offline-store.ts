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
  onPrevious?: () => void;
}

export default function CheckoutForm({ 
  formData, 
  acceptedTerms,
  onTermsChange,
  isFormValid,
  convertDateToISO,
  onSuccess,
  onPrevious
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

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
    setProgress(5);
    setStatusText("Starting payment process...");

    try {
      // Create or update patient record
      setProgress(15);
      setStatusText("Checking patient record...");
      const storedData = sessionStorage.getItem('appointmentData');
      let patientId: string | null = null;
      
      if (storedData) {
        try {
          const appointmentData = JSON.parse(storedData);
          // Use existing patientId if available (regardless of skipIntake flag)
          if (appointmentData.patientId) {
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
        
        setProgress(30);
        setStatusText("Creating patient...");
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

      // Check if test mode is enabled (skip payment for local testing)
      const isTestMode = process.env.NEXT_PUBLIC_SKIP_PAYMENT === 'true' || 
                         process.env.NODE_ENV === 'development' && 
                         process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';
      
      let paymentIntent: any = null;
      let paymentError: any = null;

      if (isTestMode) {
        // Test mode: Skip Stripe payment
        console.log('🧪 TEST MODE: Skipping payment verification');
        setProgress(55);
        setStatusText("Test mode: Skipping payment...");
        
        // Create mock payment intent for testing
        paymentIntent = {
          id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          status: 'succeeded',
          client_secret: 'test_secret'
        };
        
        // Small delay to simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Production mode: Process real payment
      setProgress(55);
      setStatusText("Confirming payment...");
        const result = await stripe.confirmPayment({
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

        paymentError = result.error;
        paymentIntent = result.paymentIntent;
      }

      if (paymentError) {
        if (paymentError.type === "card_error" || paymentError.type === "validation_error") {
          setMessage(paymentError.message || "An error occurred.");
        } else {
          setMessage("An unexpected error occurred.");
        }
        setIsLoading(false);
        return;
      }

      // Payment successful (or test mode) - save payment intent ID for later use
      // DO NOT create appointment here - wait for intake form to be completed first
      if (paymentIntent && paymentIntent.status === "succeeded") {
        try {
          setProgress(100);
          setStatusText("Payment successful!");
          
          // Save payment intent ID to sessionStorage for use after intake form is completed
          const currentAppointmentData = sessionStorage.getItem("appointmentData");
          const appointmentData = currentAppointmentData ? JSON.parse(currentAppointmentData) : {};

          // Update sessionStorage with payment intent ID and form data
          sessionStorage.setItem('appointmentData', JSON.stringify({
              ...appointmentData,
              ...formData,
              dateOfBirth: isoDateOfBirth,
              patientId: patientId,
            payment_intent_id: paymentIntent.id, // Save for later use in create-appointment
          }));

          // Call success callback to proceed to intake form
          if (onSuccess) {
            onSuccess();
          }
        } catch (error) {
          console.error("Error saving payment data:", error);
          setMessage("Payment succeeded but failed to save payment information. Please contact support.");
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to process payment. Please try again.');
    }

    setIsLoading(false);
  };

  // Check if test mode is enabled
  const isTestMode = process.env.NEXT_PUBLIC_SKIP_PAYMENT === 'true' || 
                     process.env.NODE_ENV === 'development' && 
                     process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {isTestMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
          🧪 <strong>TEST MODE ENABLED:</strong> Payment will be skipped. Appointment will be created without payment verification.
        </div>
      )}
      
      <div className="bg-[#11161c] border border-white/20 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 text-white">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-teal/10 flex items-center justify-center text-primary-teal shrink-0">
            <Lock size={16} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">Secure Payment</h3>
            <p className="text-xs text-gray-400">
              {isTestMode ? "Test Mode: Payment Skipped" : "Encrypted and secure transaction"}
            </p>
          </div>
        </div>
        
        {!isTestMode && (
        <PaymentElement 
          options={{
            layout: "tabs",
            paymentMethodOrder: ['card'],
            wallets: {
              applePay: 'never',
              googlePay: 'never',
              link: 'never',
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
        )}
        
        {isTestMode && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">Payment form disabled in test mode</p>
            <p className="text-gray-500 text-xs mt-1">Click "Complete Booking" to proceed without payment</p>
          </div>
        )}
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

      {!isLoading && (
        <div className="flex flex-row gap-2 md:gap-3 w-full">
          {onPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              className="flex-1 flex items-center justify-center bg-gray-600 text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base shadow-lg hover:bg-gray-500 transition-all"
            >
              Previous
            </button>
          )}
          <button
            disabled={!stripe || !elements || !isFormValid()}
            className="flex-1 flex items-center justify-center bg-white text-black font-bold py-3 sm:py-4 rounded-lg hover:bg-gray-200 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed gap-2 text-sm sm:text-base"
          >
            <span>Pay Now</span>
            <Lock size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary-teal transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-300 text-center">
            {statusText || "Processing..."}
          </div>
        </div>
      )}
    </form>
  );
}

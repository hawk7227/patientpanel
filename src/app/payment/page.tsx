"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "@/components/CheckoutForm";
import { Check, X, Loader2 } from "lucide-react";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  streetAddress: string;
  postalCode: string;
}

interface DoctorInfo {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
}

interface AppointmentInfo {
  visitType: string;
  appointmentDate: string;
  appointmentTime: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [appointmentInfo, setAppointmentInfo] = useState<AppointmentInfo | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    streetAddress: "",
    postalCode: "",
  });

  // Load data from sessionStorage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('appointmentData');
    if (storedData) {
      try {
        const appointmentData = JSON.parse(storedData);
        
        // Convert date from YYYY-MM-DD to MM/DD/YYYY if needed
        let formattedDateOfBirth = appointmentData.dateOfBirth || "";
        if (formattedDateOfBirth && formattedDateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parts = formattedDateOfBirth.split('-');
          formattedDateOfBirth = `${parts[1]}/${parts[2]}/${parts[0]}`;
        }
        
        setFormData({
          email: appointmentData.email || "",
          firstName: appointmentData.firstName || "",
          lastName: appointmentData.lastName || "",
          phone: appointmentData.phone || "",
          dateOfBirth: formattedDateOfBirth,
          streetAddress: appointmentData.streetAddress || "",
          postalCode: appointmentData.postalCode || "",
        });

        // Set appointment info
        if (appointmentData.visitType && appointmentData.appointmentDate && appointmentData.appointmentTime) {
          setAppointmentInfo({
            visitType: appointmentData.visitType,
            appointmentDate: appointmentData.appointmentDate,
            appointmentTime: appointmentData.appointmentTime,
          });
        }
      } catch (error) {
        console.error("Error loading appointment data:", error);
      }
    }

    // Fetch doctor info
    const fetchDoctorInfo = async () => {
      try {
        const response = await fetch('/api/get-doctor-availability?date=2025-01-01&doctorId=1fd1af57-5529-4d00-a301-e653b4829efc');
        if (response.ok) {
          const data = await response.json();
          if (data.doctor) {
            setDoctorInfo({
              id: data.doctor.id,
              name: data.doctor.name,
              credentials: "MSN, APRN, FNP-C",
              specialty: data.doctor.specialty || "Family Medicine",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching doctor info:", error);
        setDoctorInfo({
          id: "1fd1af57-5529-4d00-a301-e653b4829efc",
          name: "LaMonica Hodges",
          credentials: "MSN, APRN, FNP-C",
          specialty: "Family Medicine",
        });
      }
    };
    fetchDoctorInfo();
    
    // Create payment intent immediately on page load
    const initPaymentIntent = async () => {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 185 }),
      });
      const data = await res.json();
      setClientSecret(data.clientSecret);
    };
    initPaymentIntent();
  }, []);

  const handleDateOfBirthChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limitedNumbers = numbers.substring(0, 8);
    
    let formatted = '';
    if (limitedNumbers.length > 0) {
      formatted = limitedNumbers.substring(0, 2);
      if (limitedNumbers.length > 2) {
        formatted += '/' + limitedNumbers.substring(2, 4);
      }
      if (limitedNumbers.length > 4) {
        formatted += '/' + limitedNumbers.substring(4, 8);
      }
    }
    
    setFormData((prev) => ({ ...prev, dateOfBirth: formatted }));
  };



  const convertDateToISO = (dateStr: string): string => {
    if (dateStr && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    return '';
  };

  const isFormValid = () => {
    const isValidDateOfBirth = formData.dateOfBirth.trim() !== "" && 
      formData.dateOfBirth.length === 10 && 
      formData.dateOfBirth.match(/^\d{2}\/\d{2}\/\d{4}$/);
    
    return formData.email.trim() !== "" && 
      formData.firstName.trim() !== "" && 
      formData.lastName.trim() !== "" && 
      formData.phone.trim() !== "" && 
      isValidDateOfBirth && 
      formData.streetAddress.trim() !== "" &&
      acceptedTerms;
  };



  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#00cba9',
      colorBackground: '#0a1219',
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
    <div className="min-h-screen bg-[#0a1219] text-foreground flex flex-col font-sans">
      
      {/* Header */}
      <div className="w-full bg-[#0d1520] border-b border-primary-teal/30 py-3 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-white font-bold text-base sm:text-lg">
            Medazon Health <span className="text-primary-orange">+</span> Concierge
          </h1>
          <p className="text-primary-teal text-xs sm:text-sm font-semibold">Secure Checkout</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 sm:p-6 w-full max-w-xl mx-auto">
        
        {/* Doctor Profile */}
        <div className="w-full mb-6">
          {doctorInfo && (
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-3 ring-4 ring-primary-teal/30">
                <Image
                  src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                  alt={doctorInfo.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <h2 className="text-xl font-bold text-white">
                {doctorInfo.name}
              </h2>
              <p className="text-sm font-semibold text-gray-300">
                {doctorInfo.credentials}
              </p>
              <p className="text-xs text-primary-teal mt-1">{doctorInfo.specialty}</p>
            </div>
          )}
        </div>

        {/* Appointment Details */}
        {appointmentInfo && (
          <div className="w-full mb-6 bg-[#0d1520] border border-white/10 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Appointment Date & Time</span>
              <span className="text-xs text-gray-400">Visit Type</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white">
                {appointmentInfo.appointmentDate} at {appointmentInfo.appointmentTime}
              </span>
              <span className="text-sm font-bold text-primary-teal">
                {appointmentInfo.visitType} Call
              </span>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary-teal flex items-center justify-center">
                <Check size={20} className="text-black font-bold" />
              </div>
              <p className="text-xs text-primary-teal font-semibold mt-1">Select Visit</p>
            </div>
            <div className="w-16 h-0.5 bg-primary-teal"></div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary-teal flex items-center justify-center">
                <Check size={20} className="text-black font-bold" />
              </div>
              <p className="text-xs text-primary-teal font-semibold mt-1">Select Date</p>
            </div>
            <div className="w-16 h-0.5 bg-primary-teal"></div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary-teal flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-black"></div>
              </div>
              <p className="text-xs text-white font-semibold mt-1">Payment</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="w-full space-y-6">
          {/* Patient Information Section */}
          <div className="pt-4">
            <h3 className="text-lg font-bold text-white mb-4">Patient Details & Payment</h3>
            <p className="text-sm text-gray-400 mb-6">Please provide your information for payment processing</p>
            
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                className="w-full bg-[#0d1520] border border-primary-teal/50 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First Name"
                  className="w-full bg-[#0d1520] border border-primary-teal/50 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last Name"
                  className="w-full bg-[#0d1520] border border-primary-teal/50 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                />
              </div>
            </div>

            {/* Date of Birth & Phone */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleDateOfBirthChange(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  className="w-full bg-[#0d1520] border border-primary-teal/50 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone Number"
                  className="w-full bg-[#0d1520] border border-primary-teal/50 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                />
              </div>
            </div>

            {/* Street Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">
                Street Address <span className="text-red-400">*</span>
              </label>
              <GooglePlacesAutocomplete
                value={formData.streetAddress}
                onChange={(value) => setFormData(prev => ({ ...prev, streetAddress: value }))}
                onPlaceSelect={(place) => {
                  if (place.formatted_address) {
                    // Extract postal code from address_components
                    let postalCode = "";
                    const addressComponents = (place as any).address_components;
                    if (addressComponents) {
                      const postalCodeComponent = addressComponents.find(
                        (component: any) => component.types.includes("postal_code")
                      );
                      if (postalCodeComponent) {
                        postalCode = postalCodeComponent.long_name;
                      }
                    }
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      streetAddress: place.formatted_address || "",
                      postalCode: postalCode
                    }));
                  }
                }}
                placeholder="Your street address"
                types={["address"]}
                componentRestrictions={{ country: "us" }}
                className="w-full bg-[#0d1520] border border-primary-teal/50 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
              />
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-2 mb-6">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-primary-teal/50 bg-[#0d1520] text-primary-teal focus:ring-primary-teal focus:ring-offset-0"
              />
              <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed">
                By continuing, I agree to the <span className="text-primary-teal">Terms of Service</span>, <span className="text-primary-teal">Privacy Policy</span>, and <span className="text-primary-teal">Consent to Treat</span> and acknowledge that I have reviewed the <span className="text-primary-teal">Notice of Privacy Practices</span>.
              </label>
            </div>
          </div>

          {/* Payment Section - Shows immediately */}
          {clientSecret && (
            <Elements options={options} stripe={stripePromise}>
              <CheckoutForm 
                formData={formData}
                acceptedTerms={acceptedTerms}
                isFormValid={isFormValid}
                convertDateToISO={convertDateToISO}
              />
            </Elements>
          )}
        </div>

      </div>
    </div>
  );
}

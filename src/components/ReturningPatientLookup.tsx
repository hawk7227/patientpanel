"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Loader2 } from "lucide-react";

export default function ReturningPatientLookup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLookup = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsChecking(true);
    setError("");
    setNotFound(false);

    try {
      const res = await fetch("/api/express-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (data.found && data.patient) {
        // Store patient data and redirect to express checkout
        sessionStorage.setItem("expressPatient", JSON.stringify({
          ...data.patient,
          source: data.source,
        }));
        router.push("/express-checkout");
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setIsChecking(false);
  }, [email, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValidEmail(email.trim())) handleLookup();
  };

  return (
    <div className="mt-6 pt-5 border-t border-white/5">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <Zap size={14} className="text-primary-orange" />
        <span className="text-xs text-gray-300 font-semibold uppercase tracking-wider">
          Returning Patient? Book in 30 seconds
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); setNotFound(false); }}
          onKeyDown={handleKeyDown}
          placeholder="Enter your email..."
          className="flex-1 bg-[#11161c] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-teal transition-colors text-center sm:text-left"
        />
        <button
          onClick={handleLookup}
          disabled={isChecking || !email.trim()}
          className="bg-primary-teal text-black px-5 py-2.5 rounded-full font-bold text-sm hover:bg-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          {isChecking ? (
            <><Loader2 size={14} className="animate-spin" /> Checking...</>
          ) : (
            <>Express Book <ArrowRight size={14} /></>
          )}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}

      {notFound && (
        <p className="text-gray-400 text-xs mt-2 text-center">
          No account found.{" "}
          <button
            onClick={() => router.push("/appointment")}
            className="text-primary-teal hover:underline"
          >
            Book as a new patient →
          </button>
        </p>
      )}
    </div>
  );
}

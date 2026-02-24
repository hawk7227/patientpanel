import type { VisitType } from "@/lib/pricing";

export interface PatientInfo {
  firstName: string; lastName: string; email: string; phone: string;
  dateOfBirth: string; address: string; id: string | null; source: string;
  pharmacy?: string; drchronoPatientId?: number;
}

export interface MedicationItem {
  name: string; dosage?: string; source: string; is_active: boolean;
}

export interface PharmacyInfo {
  name: string; address: string; photo?: string; rating?: number;
  reviewCount?: number; isOpen?: boolean;
}

export interface CheckoutState {
  // Patient
  patient: PatientInfo | null;
  // Step 1: Reason + Symptoms
  reason: string;
  chiefComplaint: string;
  // Step 2: Pharmacy
  pharmacy: string;
  pharmacyAddress: string;
  pharmacyInfo: PharmacyInfo | null;
  // Step 3: Visit Type
  visitType: VisitType;
  visitTypeConfirmed: boolean;
  visitTypePopup: VisitType | null;
  // Step 3b: Date/Time (video/phone only)
  appointmentDate: string;
  appointmentTime: string;
  // Step 4: Acknowledgment
  asyncAcknowledged: boolean;
  controlledAcknowledged: boolean;
  // Refill-specific
  medications: MedicationItem[];
  selectedMeds: string[];
  medsLoading: boolean;
  hasControlledSelected: boolean;
  symptomsText: string;
  // Instant-specific
  wantToTalk: boolean;
  // Post-payment demographics
  demoFirstName: string;
  demoLastName: string;
  demoPhone: string;
  demoDOB: string;
  demoAddress: string;
}

// The visible steps the user sees (mapped to progress bar)
export type VisibleStep = "reason" | "pharmacy" | "visitType" | "dateTime" | "acknowledgment" | "payment" | "demographics" | "success";

export const STEP_LABELS: Record<VisibleStep, string> = {
  reason: "What brings you in?",
  pharmacy: "Preferred Pharmacy",
  visitType: "Visit Type",
  dateTime: "Date & Time",
  acknowledgment: "Confirm",
  payment: "Payment",
  demographics: "Pharmacy Info",
  success: "Done",
};

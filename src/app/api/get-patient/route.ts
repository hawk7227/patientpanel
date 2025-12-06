import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get patient data from patients table
    const { data: patient, error } = await supabase
      .from("patients")
      .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location, timezone, preferred_pharmacy")
      .eq("id", patientId)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { error: "Patient not found", details: error?.message },
        { status: 404 }
      );
    }

    // Also check for pharmacy_address from most recent appointment
    let pharmacyAddress = null;
    if (patient.id) {
      const { data: recentAppointment } = await supabase
        .from("appointments")
        .select("pharmacy_address")
        .eq("patient_id", patient.id)
        .not("pharmacy_address", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (recentAppointment) {
        pharmacyAddress = recentAppointment.pharmacy_address;
      }
    }

    return NextResponse.json({
      success: true,
      patient: {
        ...patient,
        pharmacy_address: pharmacyAddress,
      },
    });
  } catch (error: unknown) {
    console.error("Error in get-patient:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}


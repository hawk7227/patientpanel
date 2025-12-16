import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { 
      patientId, 
      email,
      has_drug_allergies,
      has_recent_surgeries,
      has_ongoing_medical_issues,
      preferred_pharmacy 
    } = await request.json();

    if (!patientId && !email) {
      return NextResponse.json(
        { error: "Patient ID or email is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    let finalPatientId = patientId;

    // If no patientId provided, try to find patient by email
    if (!finalPatientId && email) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (user) {
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (patient) {
          finalPatientId = patient.id;
        }
      }
    }

    if (!finalPatientId) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Build update object with only the 4 intake fields
    const updateData: Record<string, string | boolean | null> = {
      updated_at: new Date().toISOString(),
    };

    if (has_drug_allergies !== undefined) {
      updateData.has_drug_allergies = has_drug_allergies;
    }
    if (has_recent_surgeries !== undefined) {
      updateData.has_recent_surgeries = has_recent_surgeries;
    }
    if (has_ongoing_medical_issues !== undefined) {
      updateData.has_ongoing_medical_issues = has_ongoing_medical_issues;
    }
    if (preferred_pharmacy !== undefined) {
      updateData.preferred_pharmacy = preferred_pharmacy;
    }

    const { data: updatedPatient, error: updateError } = await supabase
      .from("patients")
      .update(updateData)
      .eq("id", finalPatientId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating patient intake:", updateError);
      return NextResponse.json(
        { error: "Failed to update patient intake", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patientId: finalPatientId,
      patient: updatedPatient,
    });
  } catch (error: unknown) {
    console.error("Error in update-intake-patient:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      has_drug_allergies,
      drug_allergies_details,
      has_recent_surgeries,
      recent_surgeries_details,
      has_ongoing_medical_issues,
      ongoing_medical_issues_details,
      has_current_medications,
      current_medications_details,
      preferred_pharmacy,
    } = body;

    console.log("📋 [UPDATE-INTAKE-PATIENT] Request:", {
      email,
      has_drug_allergies,
      has_recent_surgeries,
      has_ongoing_medical_issues,
      has_current_medications,
    });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (userError || !user) {
      console.log("⚠️ [UPDATE-INTAKE-PATIENT] User not found for email:", email);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find patient record by user_id
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (patientError || !patient) {
      console.log("⚠️ [UPDATE-INTAKE-PATIENT] Patient not found for user:", user.id);
      // Patient doesn't exist yet - return success anyway
      return NextResponse.json({
        success: true,
        message: "Patient record not found, skipping update",
      });
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (has_drug_allergies !== undefined) {
      updateData.has_drug_allergies = has_drug_allergies;
    }
    if (drug_allergies_details !== undefined) {
      updateData.drug_allergies_details = drug_allergies_details;
    }
    if (has_recent_surgeries !== undefined) {
      updateData.has_recent_surgeries = has_recent_surgeries;
    }
    if (recent_surgeries_details !== undefined) {
      updateData.recent_surgeries_details = recent_surgeries_details;
    }
    if (has_ongoing_medical_issues !== undefined) {
      updateData.has_ongoing_medical_issues = has_ongoing_medical_issues;
    }
    if (ongoing_medical_issues_details !== undefined) {
      updateData.ongoing_medical_issues_details = ongoing_medical_issues_details;
    }
    if (has_current_medications !== undefined) {
      updateData.has_current_medications = has_current_medications;
    }
    if (current_medications_details !== undefined) {
      updateData.current_medications_details = current_medications_details;
    }
    if (preferred_pharmacy) {
      updateData.preferred_pharmacy = preferred_pharmacy;
    }

    // Update patient record
    const { error: updateError } = await supabase
      .from("patients")
      .update(updateData)
      .eq("id", patient.id);

    if (updateError) {
      console.error("❌ [UPDATE-INTAKE-PATIENT] Error updating patient:", updateError);
      return NextResponse.json(
        { error: "Failed to update patient" },
        { status: 500 }
      );
    }

    console.log("✅ [UPDATE-INTAKE-PATIENT] Updated patient:", patient.id);

    return NextResponse.json({
      success: true,
      patientId: patient.id,
    });

  } catch (error) {
    console.error("❌ [UPDATE-INTAKE-PATIENT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}



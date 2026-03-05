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
      return NextResponse.json({
        success: true,
        message: "Patient record not found, skipping update",
      });
    }

    const patientId = patient.id;
    const updates: string[] = [];

    // ============================================
    // WRITE TO NORMALIZED TABLES
    // ============================================

    // 1. Handle allergies -> patient_allergies table
    if (has_drug_allergies !== undefined) {
      // Clear existing allergies
      await supabase
        .from("patient_allergies")
        .delete()
        .eq("patient_id", patientId);

      if (has_drug_allergies && drug_allergies_details) {
        // Split by comma or newline to get individual allergies
        const allergyList = drug_allergies_details
          .split(/[,\n]/)
          .map((a: string) => a.trim())
          .filter((a: string) => a.length > 0);

        if (allergyList.length > 0) {
          const allergyRecords = allergyList.map((allergen: string) => ({
            patient_id: patientId,
            allergen_name: allergen,
            severity: "unknown",
            status: "active",
          }));

          const { error: allergyError } = await supabase
            .from("patient_allergies")
            .insert(allergyRecords);

          if (allergyError) {
            console.error("❌ Error inserting allergies:", allergyError);
          } else {
            updates.push(`allergies (${allergyRecords.length})`);
          }
        }
      }
    }

    // 2. Handle surgeries -> clinical_notes table (patient-level, no appointment)
    if (has_recent_surgeries !== undefined && has_recent_surgeries && recent_surgeries_details) {
      const { error: surgeryError } = await supabase
        .from("clinical_notes")
        .insert({
          patient_id: patientId,
          appointment_id: null,
          note_type: "surgeries",
          content: recent_surgeries_details,
        });

      if (surgeryError) {
        console.error("❌ Error inserting surgery notes:", surgeryError);
      } else {
        updates.push("surgeries");
      }
    }

    // 3. Handle medical issues -> problems table
    if (has_ongoing_medical_issues !== undefined && has_ongoing_medical_issues && ongoing_medical_issues_details) {
      // Split by comma or newline to get individual problems
      const problemList = ongoing_medical_issues_details
        .split(/[,\n]/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);

      if (problemList.length > 0) {
        const problemRecords = problemList.map((problem: string) => ({
          patient_id: patientId,
          problem_name: problem,
          status: "active",
        }));

        const { error: problemError } = await supabase
          .from("problems")
          .insert(problemRecords);

        if (problemError) {
          console.error("❌ Error inserting problems:", problemError);
        } else {
          updates.push(`problems (${problemRecords.length})`);
        }
      }
    }

    // 4. Handle medications -> medication_orders table
    if (has_current_medications !== undefined && has_current_medications && current_medications_details) {
      // Split by comma or newline to get individual medications
      const medList = current_medications_details
        .split(/[,\n]/)
        .map((m: string) => m.trim())
        .filter((m: string) => m.length > 0);

      if (medList.length > 0) {
        const medRecords = medList.map((medication: string) => ({
          patient_id: patientId,
          appointment_id: null,
          medication_name: medication,
          status: "active",
        }));

        const { error: medError } = await supabase
          .from("medication_orders")
          .insert(medRecords);

        if (medError) {
          console.error("❌ Error inserting medications:", medError);
        } else {
          updates.push(`medications (${medRecords.length})`);
        }
      }
    }

    // ============================================
    // ALSO UPDATE PATIENTS TABLE (for backwards compatibility)
    // ============================================
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
      .eq("id", patientId);

    if (updateError) {
      console.error("❌ [UPDATE-INTAKE-PATIENT] Error updating patient:", updateError);
      return NextResponse.json(
        { error: "Failed to update patient" },
        { status: 500 }
      );
    }

    console.log("✅ [UPDATE-INTAKE-PATIENT] Updated patient:", {
      patientId: patientId,
      normalizedTablesUpdated: updates,
    });

    return NextResponse.json({
      success: true,
      patientId: patientId,
      normalizedUpdates: updates,
    });

  } catch (error) {
    console.error("❌ [UPDATE-INTAKE-PATIENT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}




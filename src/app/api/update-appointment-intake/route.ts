import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { appointmentId, accessToken, intakeData } = await request.json();

    console.log("📋 [UPDATE-APPOINTMENT-INTAKE] Request:", {
      appointmentId,
      accessToken,
      hasIntakeData: !!intakeData,
    });

    if (!appointmentId && !accessToken) {
      return NextResponse.json(
        { error: "Appointment ID or access token is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find the appointment with patient_id
    let appointment: { id: string; patient_id: string; intake_data: Record<string, unknown> | null } | null = null;
    
    if (appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, intake_data")
        .eq("id", appointmentId)
        .single();
      
      if (error || !data) {
        console.log("⚠️ [UPDATE-APPOINTMENT-INTAKE] Appointment not found by ID:", appointmentId);
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }
      appointment = data;
    } else if (accessToken) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, intake_data")
        .eq("access_token", accessToken)
        .single();
      
      if (error || !data) {
        console.log("⚠️ [UPDATE-APPOINTMENT-INTAKE] Appointment not found by accessToken:", accessToken);
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }
      appointment = data;
    }

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const patientId = appointment.patient_id;
    console.log("📋 [UPDATE-APPOINTMENT-INTAKE] Patient ID:", patientId);

    // Track what was updated
    const updates: string[] = [];

    // ============================================
    // WRITE TO NORMALIZED TABLES
    // ============================================

    // 1. Handle allergies -> patient_allergies table
    if (intakeData.allergies !== undefined) {
      // Clear existing allergies for this patient
      await supabase
        .from("patient_allergies")
        .delete()
        .eq("patient_id", patientId);

      // If patient has allergies, insert them
      if (intakeData.allergies && intakeData.allergiesDetails) {
        // Split by comma or newline to get individual allergies
        const allergyList = intakeData.allergiesDetails
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

    // 2. Handle surgeries -> clinical_notes table
    if (intakeData.surgeries !== undefined && intakeData.surgeries && intakeData.surgeriesDetails) {
      // Delete existing surgery notes for this appointment
      await supabase
        .from("clinical_notes")
        .delete()
        .eq("appointment_id", appointment.id)
        .eq("note_type", "surgeries");

      const { error: surgeryError } = await supabase
        .from("clinical_notes")
        .insert({
          patient_id: patientId,
          appointment_id: appointment.id,
          note_type: "surgeries",
          content: intakeData.surgeriesDetails,
        });

      if (surgeryError) {
        console.error("❌ Error inserting surgery notes:", surgeryError);
      } else {
        updates.push("surgeries");
      }
    }

    // 3. Handle medical issues -> problems table
    if (intakeData.medicalIssues !== undefined) {
      // Clear existing active problems from this appointment context
      // Note: We only clear problems, not all problems for the patient
      
      if (intakeData.medicalIssues && intakeData.medicalIssuesDetails) {
        // Split by comma or newline to get individual problems
        const problemList = intakeData.medicalIssuesDetails
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

        // Also save as clinical note for assessment
        await supabase
          .from("clinical_notes")
          .delete()
          .eq("appointment_id", appointment.id)
          .eq("note_type", "assessment");

        await supabase
          .from("clinical_notes")
          .insert({
            patient_id: patientId,
            appointment_id: appointment.id,
            note_type: "assessment",
            content: intakeData.medicalIssuesDetails,
          });
      }
    }

    // 4. Handle medications -> medication_orders table
    if (intakeData.medications !== undefined) {
      // Clear existing active medication orders for this appointment
      await supabase
        .from("medication_orders")
        .delete()
        .eq("patient_id", patientId)
        .eq("appointment_id", appointment.id)
        .eq("status", "active");

      if (intakeData.medications && intakeData.medicationsDetails) {
        // Split by comma or newline to get individual medications
        const medList = intakeData.medicationsDetails
          .split(/[,\n]/)
          .map((m: string) => m.trim())
          .filter((m: string) => m.length > 0);

        if (medList.length > 0) {
          const medRecords = medList.map((medication: string) => ({
            patient_id: patientId,
            appointment_id: appointment.id,
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
    }

    // 5. Handle pharmacy -> patients table
    if (intakeData.pharmacy) {
      const { error: pharmacyError } = await supabase
        .from("patients")
        .update({
          preferred_pharmacy: intakeData.pharmacy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patientId);

      if (pharmacyError) {
        console.error("❌ Error updating pharmacy:", pharmacyError);
      } else {
        updates.push("pharmacy");
      }
    }

    // ============================================
    // ALSO UPDATE APPOINTMENTS TABLE (for backwards compatibility)
    // ============================================
    const existingIntake = appointment.intake_data || {};
    const updatedIntake = {
      ...existingIntake,
      ...intakeData,
      updated_at: new Date().toISOString(),
    };

    // Build intake notes for text display
    const intakeNotes = [];
    if (intakeData.allergies !== null && intakeData.allergies !== undefined) {
      intakeNotes.push(`Drug Allergies: ${intakeData.allergies ? `Yes - ${intakeData.allergiesDetails || 'Not specified'}` : 'No'}`);
    }
    if (intakeData.surgeries !== null && intakeData.surgeries !== undefined) {
      intakeNotes.push(`Recent Surgeries: ${intakeData.surgeries ? `Yes - ${intakeData.surgeriesDetails || 'Not specified'}` : 'No'}`);
    }
    if (intakeData.medicalIssues !== null && intakeData.medicalIssues !== undefined) {
      intakeNotes.push(`Ongoing Medical Issues: ${intakeData.medicalIssues ? `Yes - ${intakeData.medicalIssuesDetails || 'Not specified'}` : 'No'}`);
    }
    if (intakeData.medications !== null && intakeData.medications !== undefined) {
      intakeNotes.push(`Current Medications: ${intakeData.medications ? `Yes - ${intakeData.medicationsDetails || 'Not specified'}` : 'No'}`);
    }
    if (intakeData.pharmacy) {
      intakeNotes.push(`Preferred Pharmacy: ${intakeData.pharmacy}`);
    }

    // Update the appointment
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        intake_data: updatedIntake,
        intake_notes: intakeNotes.join('\n'),
        intake_completed: true,
        intake_completed_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error("❌ [UPDATE-APPOINTMENT-INTAKE] Error updating appointment:", updateError);
      return NextResponse.json(
        { error: "Failed to update appointment intake" },
        { status: 500 }
      );
    }

    console.log("✅ [UPDATE-APPOINTMENT-INTAKE] Successfully updated:", {
      appointmentId: appointment.id,
      patientId: patientId,
      normalizedTablesUpdated: updates,
      intakeFields: Object.keys(intakeData),
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      message: "Intake data updated successfully",
      normalizedUpdates: updates,
    });

  } catch (error) {
    console.error("❌ [UPDATE-APPOINTMENT-INTAKE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}






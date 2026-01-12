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

    // Find the appointment
    let appointment;
    if (appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, intake_data")
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
        .select("id, intake_data")
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

    // Merge existing intake data with new intake data
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

    // Update the appointment with intake data
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
      intakeFields: Object.keys(intakeData),
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      message: "Intake data updated successfully",
    });

  } catch (error) {
    console.error("❌ [UPDATE-APPOINTMENT-INTAKE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




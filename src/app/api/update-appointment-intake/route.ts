import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { appointmentId, accessToken, intakeData } = await request.json();

    if (!appointmentId && !accessToken) {
      return NextResponse.json(
        { error: "Appointment ID or access token is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find the appointment
    let appointment: { id: string; intake_data: Record<string, unknown> | null } | null = null;
    
    if (appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, intake_data")
        .eq("id", appointmentId)
        .single();
      
      if (error || !data) {
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
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }
      appointment = data;
    }

    // At this point appointment should be defined, but TypeScript needs reassurance
    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Merge existing intake data with new intake data
    const existingIntake = appointment.intake_data || {};
    const updatedIntake = {
      ...existingIntake,
      ...intakeData,
      updated_at: new Date().toISOString(),
    };

    // Update the appointment with intake data
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        intake_data: updatedIntake,
        intake_completed: true,
        intake_completed_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error("Error updating appointment intake:", updateError);
      return NextResponse.json(
        { error: "Failed to update appointment intake" },
        { status: 500 }
      );
    }

    console.log("[UPDATE_INTAKE] Successfully updated appointment intake:", {
      appointmentId: appointment.id,
      intakeFields: Object.keys(intakeData),
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      message: "Intake data updated successfully",
    });

  } catch (error) {
    console.error("Error in update-appointment-intake:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


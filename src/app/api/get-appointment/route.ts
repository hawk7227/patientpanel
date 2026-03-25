import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get appointment by access token
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        patient_first_name,
        patient_last_name,
        requested_date_time,
        visit_type,
        zoom_meeting_url,
        zoom_start_url,
        patient_phone,
        doctor_id,
        dailyco_meeting_url,
        dailyco_room_name,
        dailyco_owner_token,
        dailyco_patient_token,
        intake_completed,
        intake_completed_at,
        preferred_pharmacy,
        pharmacy_address,
        chief_complaint
      `)
      .eq("access_token", token)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Get doctor information
    let doctor = null;
    if (appointment.doctor_id) {
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("first_name, last_name, specialty, phone")
        .eq("id", appointment.doctor_id)
        .single();
      doctor = doctorData;
    }

    // Get pharmacy phone from patients table (not stored on appointments)
    let pharmacy_phone: string | null = null;
    if (appointment.patient_id) {
      const { data: patientData } = await supabase
        .from("patients")
        .select("preferred_pharmacy_phone")
        .eq("id", appointment.patient_id)
        .single();
      pharmacy_phone = patientData?.preferred_pharmacy_phone || null;
    }

    return NextResponse.json({
      success: true,
      appointment: {
        ...appointment,
        pharmacy_phone,
        doctor,
      },
    });
  } catch (error: unknown) {
    console.error("Error in get-appointment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

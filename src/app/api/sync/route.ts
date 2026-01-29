import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const SYNC_API_KEY = process.env.SYNC_API_KEY || "mEdAz0n_SyNc_2026_xK9mPqL7nR3wT5vA";
const MEDAZON_SYNC_URL = process.env.MEDAZON_SYNC_URL || "https://medazonhealth.com/api/sync/receive-appointment";
const DOCTOR_ID = "1fd1af57-5529-4d00-a301-e653b4829efc";

/**
 * Verify the sync API key
 */
function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get("X-Sync-Api-Key") || request.headers.get("x-sync-api-key");
  return apiKey === SYNC_API_KEY;
}

/**
 * POST /api/sync/receive-from-medazon
 * Receives appointments from Medazon PHP and creates them in Supabase
 */
export async function POST(request: Request) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized - Invalid API key" }, { status: 401 });
    }

    const data = await request.json();
    console.log("[SYNC] Received appointment from Medazon:", data.medazon_booking_id);

    // Validate required fields
    const required = ["medazon_booking_id", "patient_email", "appointment_date", "appointment_time"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    // Check if appointment already synced
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("medazon_booking_id", data.medazon_booking_id)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Appointment already synced",
        supabase_appointment_id: existing.id,
      });
    }

    // Find or create patient
    let patient = null;
    
    // Try to find by email
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id, user_id")
      .eq("email", data.patient_email.toLowerCase().trim())
      .single();

    if (existingPatient) {
      patient = existingPatient;
    } else {
      // Create new patient
      // First check/create user
      let userId: string | null = null;
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", data.patient_email.toLowerCase().trim())
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser } = await supabase
          .from("users")
          .insert({
            email: data.patient_email.toLowerCase().trim(),
            first_name: data.patient_first_name || "Patient",
            last_name: data.patient_last_name || "",
            mobile_phone: data.patient_phone,
          })
          .select("id")
          .single();
        
        userId = newUser?.id || null;
      }

      // Create patient record
      const { data: newPatient } = await supabase
        .from("patients")
        .insert({
          user_id: userId,
          first_name: data.patient_first_name || "Patient",
          last_name: data.patient_last_name || "",
          email: data.patient_email.toLowerCase().trim(),
          phone: data.patient_phone,
          date_of_birth: data.patient_dob,
        })
        .select("id, user_id")
        .single();

      patient = newPatient;
    }

    if (!patient) {
      return NextResponse.json({ error: "Failed to find or create patient" }, { status: 500 });
    }

    // Build requested_date_time in Phoenix timezone
    const appointmentDate = data.appointment_date;
    const appointmentTime = data.appointment_time;
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const [year, month, day] = appointmentDate.split("-").map(Number);
    
    // Create date in Phoenix timezone (UTC-7)
    const phoenixDate = new Date(Date.UTC(year, month - 1, day, hours + 7, minutes, 0));
    const requestedDateTime = phoenixDate.toISOString();

    // Generate access token
    const generateToken = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let token = "";
      for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };

    // Create appointment
    const appointmentData = {
      user_id: patient.user_id,
      patient_id: patient.id,
      doctor_id: DOCTOR_ID,
      payment_status: data.payment_status || "captured",
      status: "pending",
      visit_type: data.visit_type || "video",
      requested_date_time: requestedDateTime,
      service_type: "uti_treatment",
      patient_first_name: data.patient_first_name,
      patient_last_name: data.patient_last_name,
      patient_email: data.patient_email,
      patient_phone: data.patient_phone,
      patient_dob: data.patient_dob,
      patient_timezone: "America/Phoenix",
      consent_accepted: false,
      access_token: generateToken(),
      medazon_booking_id: data.medazon_booking_id,
      synced_from: "medazon",
      synced_at: new Date().toISOString(),
    };

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert(appointmentData)
      .select("id")
      .single();

    if (error) {
      console.error("[SYNC] Failed to create appointment:", error);
      return NextResponse.json({ error: "Failed to create appointment", details: error.message }, { status: 500 });
    }

    // Save chief complaint if provided
    if (data.chief_complaint && appointment?.id && patient?.id) {
      await supabase.from("clinical_notes").insert({
        patient_id: patient.id,
        appointment_id: appointment.id,
        note_type: "chief_complaint",
        content: data.chief_complaint,
      });
    }

    console.log("[SYNC] Successfully synced appointment from Medazon:", appointment.id);

    return NextResponse.json({
      success: true,
      message: "Appointment synced successfully",
      supabase_appointment_id: appointment.id,
    });

  } catch (error) {
    console.error("[SYNC] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to send appointment to Medazon
 * Call this after creating an appointment in Supabase
 */
export async function sendToMedazon(appointmentData: {
  supabase_appointment_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone?: string;
  patient_dob?: string;
  appointment_date: string;
  appointment_time: string;
  visit_type?: string;
  chief_complaint?: string;
  payment_status?: string;
}): Promise<{ success: boolean; medazon_booking_id?: number; error?: string }> {
  try {
    console.log("[SYNC] Sending appointment to Medazon:", appointmentData.supabase_appointment_id);

    const response = await fetch(MEDAZON_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Api-Key": SYNC_API_KEY,
      },
      body: JSON.stringify(appointmentData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("[SYNC] Successfully synced to Medazon:", result.booking_id);
      return { success: true, medazon_booking_id: result.booking_id };
    } else {
      console.error("[SYNC] Failed to sync to Medazon:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("[SYNC] Error sending to Medazon:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = createServerClient();

    console.log("📧 [CHECK-EMAIL] Checking:", normalizedEmail);

    // First check if user exists by email in users table
    const { data: existingUser, error: userSearchError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, mobile_phone, date_of_birth, address")
      .eq("email", normalizedEmail)
      .single();

    if (userSearchError && userSearchError.code !== 'PGRST116') {
      console.error("Error searching for user:", userSearchError);
    }

    // If user exists, check if they have a patient record
    if (existingUser) {
      console.log("📧 [CHECK-EMAIL] User found:", existingUser.id);
      
      // Check for patient by user_id (primary method)
      const { data: patientByUserId } = await supabase
        .from("patients")
        .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location")
        .eq("user_id", existingUser.id)
        .single();

      if (patientByUserId) {
        console.log("📧 [CHECK-EMAIL] Patient found by user_id:", patientByUserId.id);
        // RETURNING PATIENT - has user account AND patient record
        return NextResponse.json({
          exists: true,
          patientId: patientByUserId.id,
          user: existingUser,
          patient: patientByUserId,
        });
      }

      // Also check for patient by email (fallback)
      const { data: patientByEmail } = await supabase
        .from("patients")
        .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location")
        .eq("email", normalizedEmail)
        .single();

      if (patientByEmail) {
        console.log("📧 [CHECK-EMAIL] Patient found by email:", patientByEmail.id);
        // RETURNING PATIENT - has patient record
        return NextResponse.json({
          exists: true,
          patientId: patientByEmail.id,
          user: existingUser,
          patient: patientByEmail,
        });
      }

      // User exists but NO patient record (has account but never completed appointment)
      console.log("📧 [CHECK-EMAIL] User exists but no patient record - needs intake");
      return NextResponse.json({
        exists: true,
        userId: existingUser.id,
        patientId: null, // No patient record yet - will need intake
        user: existingUser,
        patient: null,
      });
    }

    // No user found - check if patient exists directly by email (edge case)
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location")
      .eq("email", normalizedEmail)
      .single();

    if (existingPatient) {
      console.log("📧 [CHECK-EMAIL] Patient found (no user):", existingPatient.id);
      // RETURNING PATIENT - has patient record from previous appointment
      return NextResponse.json({
        exists: true,
        patientId: existingPatient.id,
        user: {
          first_name: existingPatient.first_name,
          last_name: existingPatient.last_name,
          email: existingPatient.email,
          mobile_phone: existingPatient.phone,
          date_of_birth: existingPatient.date_of_birth,
          address: existingPatient.location,
        },
        patient: existingPatient,
      });
    }

    // Completely new - no user, no patient
    console.log("📧 [CHECK-EMAIL] New user - no records found");
    return NextResponse.json({
      exists: false,
      patientId: null,
      user: null,
      patient: null,
    });
  } catch (error: unknown) {
    console.error("Error in check-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}





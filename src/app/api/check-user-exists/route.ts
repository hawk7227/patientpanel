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

    // First check if patient exists directly by email (for returning patients)
    const { data: existingPatient, error: patientSearchError } = await supabase
      .from("patients")
      .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location")
      .eq("email", normalizedEmail)
      .single();

    if (patientSearchError && patientSearchError.code !== 'PGRST116') {
      console.error("Error searching for patient:", patientSearchError);
    }

    if (existingPatient) {
      // RETURNING PATIENT - has patient record from previous appointment
      // Get user data if they have a user account
      let userData = null;
      if (existingPatient.user_id) {
        const { data: user } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, mobile_phone, date_of_birth, address")
          .eq("id", existingPatient.user_id)
          .single();
        userData = user;
      }

      return NextResponse.json({
        exists: true,
        patientId: existingPatient.id,
        user: userData || {
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

    // Check if user exists by email in users table (might have account but no appointment yet)
    const { data: existingUser, error: userSearchError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, mobile_phone, date_of_birth, address")
      .eq("email", normalizedEmail)
      .single();

    if (userSearchError && userSearchError.code !== 'PGRST116') {
      console.error("Error searching for user:", userSearchError);
      return NextResponse.json(
        { error: "Failed to check user", details: userSearchError.message },
        { status: 500 }
      );
    }

    if (existingUser) {
      // User exists but NO patient record (has account but never had appointment)
      return NextResponse.json({
        exists: true,
        userId: existingUser.id,
        patientId: null, // No patient record yet - will need intake
        user: existingUser,
        patient: null,
      });
    }

    // Completely new - no user, no patient
    return NextResponse.json({
      exists: false,
      patientId: null,
      user: null,
      patient: null,
    });
  } catch (error: any) {
    console.error("Error in check-email:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}




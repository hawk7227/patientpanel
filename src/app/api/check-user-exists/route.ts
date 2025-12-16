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

    const supabase = createServerClient();

    // Check if user exists by email in users table
    const { data: existingUser, error: userSearchError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, mobile_phone, date_of_birth, address")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userSearchError && userSearchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if user doesn't exist
      console.error("Error searching for user:", userSearchError);
      return NextResponse.json(
        { error: "Failed to check user", details: userSearchError.message },
        { status: 500 }
      );
    }

    if (existingUser) {
      // User exists - check if patient record exists
      const { data: existingPatient, error: patientSearchError } = await supabase
        .from("patients")
        .select("id, user_id, first_name, last_name, email")
        .eq("user_id", existingUser.id)
        .single();

      if (patientSearchError && patientSearchError.code !== 'PGRST116') {
        console.error("Error searching for patient:", patientSearchError);
        // If error is not "not found", return error
        return NextResponse.json(
          { error: "Failed to check patient", details: patientSearchError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        exists: true,
        user: existingUser,
        patient: existingPatient || null,
        patientId: existingPatient?.id || null,
      });
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (error: any) {
    console.error("Error in check-user-exists:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import patientIndex from "@/data/patient-index.json";

// =============================================
// EXPRESS PATIENT LOOKUP
// =============================================
// Priority order:
//   1. Local JSON index (4,704 patients from backup — zero external dependency)
//   2. Supabase patients table (patients created through booking flow)
//   3. Supabase users table (has account but no appointment yet)
//
// The JSON index is loaded once at startup (~866KB) and stays in memory.
// No DrChrono API calls. No external dependencies for the bulk lookup.
// =============================================

// Type the imported JSON as a record of email -> patient data
const index = patientIndex as Record<
  string,
  {
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    pharmacy: string;
  }
>;

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
    console.log("⚡ [EXPRESS-LOOKUP] Checking:", normalizedEmail);

    // =============================================
    // 1. CHECK LOCAL JSON INDEX (fast, no network)
    // =============================================
    const localPatient = index[normalizedEmail];
    if (localPatient) {
      console.log("⚡ [EXPRESS-LOOKUP] Found in local index:", localPatient.firstName, localPatient.lastName);
      return NextResponse.json({
        found: true,
        source: "local",
        patient: {
          id: null,
          firstName: localPatient.firstName,
          lastName: localPatient.lastName,
          email: normalizedEmail,
          phone: localPatient.phone,
          dateOfBirth: localPatient.dateOfBirth,
          address: localPatient.address,
          pharmacy: localPatient.pharmacy,
        },
      });
    }

    // =============================================
    // 2. CHECK SUPABASE PATIENTS TABLE
    //    (for patients created through the booking flow after the backup)
    // =============================================
    const supabase = createServerClient();

    const { data: patient } = await supabase
      .from("patients")
      .select(
        "id, user_id, first_name, last_name, email, phone, date_of_birth, location, preferred_pharmacy"
      )
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (patient) {
      console.log("⚡ [EXPRESS-LOOKUP] Found in patients table:", patient.id);

      // Get address from users table if patient record doesn't have it
      let address = patient.location || "";
      if (!address && patient.user_id) {
        const { data: user } = await supabase
          .from("users")
          .select("address")
          .eq("id", patient.user_id)
          .maybeSingle();
        if (user?.address) address = user.address;
      }

      return NextResponse.json({
        found: true,
        source: "patients",
        patient: {
          id: patient.id,
          firstName: patient.first_name || "",
          lastName: patient.last_name || "",
          email: normalizedEmail,
          phone: patient.phone || "",
          dateOfBirth: patient.date_of_birth || "",
          address: address,
          pharmacy: patient.preferred_pharmacy || "",
        },
      });
    }

    // =============================================
    // 3. CHECK SUPABASE USERS TABLE
    //    (has account but maybe no appointment yet)
    // =============================================
    const { data: user } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, email, mobile_phone, date_of_birth, address"
      )
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (user) {
      const { data: patientByUser } = await supabase
        .from("patients")
        .select("id, preferred_pharmacy")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("⚡ [EXPRESS-LOOKUP] Found in users table:", user.id);

      return NextResponse.json({
        found: true,
        source: patientByUser ? "patients" : "users",
        patient: {
          id: patientByUser?.id || null,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          email: normalizedEmail,
          phone: user.mobile_phone || "",
          dateOfBirth: user.date_of_birth || "",
          address: user.address || "",
          pharmacy: patientByUser?.preferred_pharmacy || "",
        },
      });
    }

    // =============================================
    // NOT FOUND ANYWHERE
    // =============================================
    console.log("⚡ [EXPRESS-LOOKUP] Not found:", normalizedEmail);
    return NextResponse.json({ found: false });
  } catch (error: unknown) {
    console.error("⚡ [EXPRESS-LOOKUP] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


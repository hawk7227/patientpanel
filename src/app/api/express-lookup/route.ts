import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = createServerClient();

    console.log("⚡ [EXPRESS-LOOKUP] Checking:", normalizedEmail);

    // 1. Check patients table (primary — has had appointments through our system)
    const { data: patient } = await supabase
      .from("patients")
      .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (patient) {
      console.log("⚡ [EXPRESS-LOOKUP] Found in patients table:", patient.id);
      
      // Also get user record for extra info
      let userAddress = patient.location || "";
      if (patient.user_id) {
        const { data: user } = await supabase
          .from("users")
          .select("address, mobile_phone")
          .eq("id", patient.user_id)
          .maybeSingle();
        if (user?.address) userAddress = user.address;
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
          address: userAddress,
        },
      });
    }

    // 2. Check users table (has account but maybe no appointment yet)
    const { data: user } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, mobile_phone, date_of_birth, address")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (user) {
      // Check if they have a patient record by user_id
      const { data: patientByUser } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("⚡ [EXPRESS-LOOKUP] Found in users table:", user.id, "patient:", !!patientByUser);

      return NextResponse.json({
        found: true,
        source: patientByUser ? "patients" : "users",
        patientId: patientByUser?.id || null,
        patient: {
          id: patientByUser?.id || null,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          email: normalizedEmail,
          phone: user.mobile_phone || "",
          dateOfBirth: user.date_of_birth || "",
          address: user.address || "",
        },
      });
    }

    // 3. Check drchrono_patients (synced from DrChrono — 6,968+ patients)
    const { data: drchronoPatient } = await supabase
      .from("drchrono_patients")
      .select("drchrono_patient_id, first_name, last_name, email, cell_phone, date_of_birth, address, city, state, zip_code, default_pharmacy")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (drchronoPatient) {
      console.log("⚡ [EXPRESS-LOOKUP] Found in drchrono_patients:", drchronoPatient.drchrono_patient_id);

      const fullAddress = [drchronoPatient.address, drchronoPatient.city, drchronoPatient.state, drchronoPatient.zip_code]
        .filter(Boolean).join(", ");

      return NextResponse.json({
        found: true,
        source: "drchrono",
        patient: {
          id: null, // no local patient record yet
          drchronoPatientId: drchronoPatient.drchrono_patient_id,
          firstName: drchronoPatient.first_name || "",
          lastName: drchronoPatient.last_name || "",
          email: normalizedEmail,
          phone: drchronoPatient.cell_phone || "",
          dateOfBirth: drchronoPatient.date_of_birth || "",
          address: fullAddress,
          pharmacy: drchronoPatient.default_pharmacy || "",
        },
      });
    }

    // Not found anywhere
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

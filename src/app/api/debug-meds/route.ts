import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId") || "abb0ff6c-02c7-445d-a181-7dafa078df21";

  // Step 1: Get patient
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .select("id, email, drchrono_patient_id")
    .eq("id", patientId)
    .single();

  const step1 = { patient, error: pErr?.message || null };

  // Step 2: Query drchrono_medications directly
  let step2: any = { skipped: true };
  if (patient?.drchrono_patient_id) {
    const { data: meds, error: mErr, count } = await supabase
      .from("drchrono_medications")
      .select("name, status, date_prescribed", { count: "exact" })
      .eq("drchrono_patient_id", patient.drchrono_patient_id)
      .limit(20);

    step2 = {
      drchrono_patient_id: patient.drchrono_patient_id,
      count,
      found: meds?.length || 0,
      error: mErr?.message || null,
      meds: meds?.map(m => m.name) || [],
    };
  }

  // Step 3: Skip RLS check (not needed)

  // Step 4: Try raw count
  const { count: rawCount, error: rawErr } = await supabase
    .from("drchrono_medications")
    .select("*", { count: "exact", head: true })
    .eq("drchrono_patient_id", patient?.drchrono_patient_id || 0);

  return NextResponse.json({
    step1_patient: step1,
    step2_meds: step2,
    step4_raw_count: { count: rawCount, error: rawErr?.message || null },
    debug: {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  });
}

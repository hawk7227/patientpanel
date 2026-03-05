import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  const seen = new Set<string>();
  const medications: { name: string; dosage: string; source: string; is_active: boolean }[] = [];

  const addMed = (name: string, dosage: string, source: string, active: boolean) => {
    const key = name.toLowerCase().trim();
    if (!key || key.length < 2 || seen.has(key)) return;
    seen.add(key);
    medications.push({ name: name.trim(), dosage, source, is_active: active });
  };

  try {
    // Get patient's drchrono_patient_id
    const { data: patient, error: pErr } = await supabase
      .from("patients")
      .select("drchrono_patient_id, email")
      .eq("id", patientId)
      .single();

    console.log(`[Meds] patient=${patientId} drchrono=${patient?.drchrono_patient_id} err=${pErr?.message || "none"}`);

    let dcId = patient?.drchrono_patient_id;

    // Email fallback if no drchrono_patient_id
    if (!dcId && patient?.email) {
      const { data: dcP } = await supabase
        .from("drchrono_patients")
        .select("drchrono_patient_id")
        .ilike("email", patient.email)
        .limit(1)
        .maybeSingle();
      if (dcP?.drchrono_patient_id) {
        dcId = dcP.drchrono_patient_id;
        console.log(`[Meds] email fallback found dcId=${dcId}`);
      }
    }

    // Query drchrono_medications
    if (dcId) {
      const { data: meds, error: mErr } = await supabase
        .from("drchrono_medications")
        .select("name, dosage_quantity, dosage_unit, sig, frequency, status, date_stopped_taking")
        .eq("drchrono_patient_id", dcId)
        .order("date_prescribed", { ascending: false });

      console.log(`[Meds] drchrono_medications: ${meds?.length || 0} err=${mErr?.message || "none"}`);

      for (const m of meds || []) {
        const dosage = [m.dosage_quantity, m.dosage_unit, m.frequency].filter(Boolean).join(" ") || m.sig || "";
        addMed(m.name || "", dosage, "DrChrono", m.status !== "inactive" && !m.date_stopped_taking);
      }
    }

    // Query patient_medications
    try {
      const { data: pm } = await supabase
        .from("patient_medications")
        .select("medication_name, name, dosage, sig, status, end_date")
        .eq("patient_id", patientId);

      for (const m of pm || []) {
        addMed(m.medication_name || m.name || "", m.dosage || m.sig || "", "Prescribed", m.status !== "inactive" && !m.end_date);
      }
    } catch {}

    console.log(`[Meds] TOTAL: ${medications.length}`);
    return NextResponse.json({ medications, count: medications.length, sources: [...new Set(medications.map(m => m.source))] });
  } catch (err: any) {
    console.error("[Meds] FATAL:", err.message);
    return NextResponse.json({ error: err.message, medications: [], count: 0, sources: [] }, { status: 500 });
  }
}

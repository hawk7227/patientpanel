// ═══════════════════════════════════════════════════════════════
// MEDICATIONS API — Returns patient medications from 3 sources
//
// GET /api/medications?patientId=xxx
// Sources: 1) DrChrono API  2) Supabase medication_history  3) Appointment records
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Medication {
  name: string;
  dosage?: string;
  source: string;
  is_active: boolean;
}

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }

  const medications: Medication[] = [];
  const seen = new Set<string>();

  const addMed = (name: string, dosage: string, source: string, active: boolean) => {
    const key = name.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    medications.push({ name: name.trim(), dosage, source, is_active: active });
  };

  try {
    // Source 1: DrChrono API (if configured)
    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("drchrono_patient_id")
        .eq("id", patientId)
        .single();

      if (patient?.drchrono_patient_id) {
        const { data: tokenRow } = await supabase
          .from("drchrono_tokens")
          .select("access_token")
          .limit(1)
          .single();

        if (tokenRow?.access_token) {
          const res = await fetch(
            `https://app.drchrono.com/api/medications?patient=${patient.drchrono_patient_id}`,
            { headers: { Authorization: `Bearer ${tokenRow.access_token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const meds = data.results || data || [];
            for (const m of (Array.isArray(meds) ? meds : [])) {
              addMed(
                m.name || m.medication || "",
                m.dosage || m.dose || "",
                "drchrono",
                m.status !== "inactive"
              );
            }
          }
        }
      }
    } catch (e) {
      console.log("[Meds] DrChrono source skipped:", (e as Error).message);
    }

    // Source 2: Supabase medication_history
    try {
      const { data: history } = await supabase
        .from("medication_history")
        .select("medication_name, dosage, end_date")
        .eq("patient_id", patientId);

      for (const m of history || []) {
        addMed(m.medication_name, m.dosage || "", "database", !m.end_date);
      }
    } catch (e) {
      console.log("[Meds] medication_history skipped:", (e as Error).message);
    }

    // Source 3: Appointment records (medications_details or chief_complaint)
    try {
      const { data: appts } = await supabase
        .from("appointments")
        .select("symptoms, chief_complaint")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const a of appts || []) {
        // Parse medications from symptoms/chief_complaint
        const text = `${a.symptoms || ""} ${a.chief_complaint || ""}`;
        const medPatterns = text.match(/(?:taking|medication|prescribed|refill)\s*:?\s*([^,.\n]+)/gi);
        for (const match of medPatterns || []) {
          const med = match.replace(/^(taking|medication|prescribed|refill)\s*:?\s*/i, "").trim();
          if (med.length > 2 && med.length < 100) {
            addMed(med, "", "appointment", true);
          }
        }
      }
    } catch (e) {
      console.log("[Meds] appointments source skipped:", (e as Error).message);
    }

    return NextResponse.json({ medications, count: medications.length });
  } catch (err: any) {
    console.error("[Meds] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

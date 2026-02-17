// ═══════════════════════════════════════════════════════════════
// MEDICATIONS FROM EXPORT — Fallback that reads from saved JSON
//
// GET /api/medications-from-export?email=xxx
// Reads from Supabase patient_data_exports or /public/data/patient-medications.json
// Works as offline fallback when DrChrono/Supabase live queries fail
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  const patientId = req.nextUrl.searchParams.get("patientId");

  if (!email && !patientId) {
    return NextResponse.json({ error: "email or patientId required" }, { status: 400 });
  }

  try {
    // Try loading from Supabase saved export
    const { data: exportRow, error } = await supabase
      .from("patient_data_exports")
      .select("data, generated_at")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (error || !exportRow?.data) {
      return NextResponse.json({ 
        medications: [], 
        count: 0, 
        source: "export", 
        error: "No export found. Run /api/generate-export first." 
      });
    }

    const patients = exportRow.data as any[];
    let patientRecord = null;

    // Find by email first
    if (email) {
      patientRecord = patients.find(p => p.email?.toLowerCase() === email);
    }

    // If not found by email, try by patientId → drchrono_patient_id lookup
    if (!patientRecord && patientId) {
      // Get the drchrono_patient_id from patients table
      const { data: pt } = await supabase
        .from("patients")
        .select("drchrono_patient_id, email")
        .eq("id", patientId)
        .single();

      if (pt?.drchrono_patient_id) {
        patientRecord = patients.find(p => p.drchrono_patient_id === pt.drchrono_patient_id);
      }
      if (!patientRecord && pt?.email) {
        patientRecord = patients.find(p => p.email?.toLowerCase() === pt.email.toLowerCase());
      }
    }

    if (!patientRecord) {
      return NextResponse.json({ 
        medications: [], 
        count: 0, 
        source: "export",
        generated_at: exportRow.generated_at,
      });
    }

    // Deduplicate medications by name
    const seen = new Set<string>();
    const medications = [];
    for (const m of patientRecord.medications || []) {
      const key = (m.name || "").toLowerCase().trim();
      if (!key || key.length < 2 || seen.has(key)) continue;
      seen.add(key);
      medications.push({
        name: m.name,
        dosage: m.dosage || "",
        source: "Export",
        is_active: m.status !== "inactive" && !m.date_stopped,
      });
    }

    return NextResponse.json({
      medications,
      count: medications.length,
      source: "export",
      generated_at: exportRow.generated_at,
      patient_name: `${patientRecord.first_name} ${patientRecord.last_name}`.trim(),
    });
  } catch (err: any) {
    console.error("[MedsExport] Error:", err.message);
    return NextResponse.json({ error: err.message, medications: [], count: 0 }, { status: 500 });
  }
}

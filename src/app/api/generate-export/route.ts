// ═══════════════════════════════════════════════════════════════
// GENERATE PATIENT DATA EXPORT — Saves full JSON to /public/data/
//
// GET /api/generate-export
// Creates: /public/data/patient-medications.json
//
// This file can be served statically — works without internet
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("[Export] Starting full patient data export...");

    // ── 1. Get all DrChrono patients ──────────────────────────
    const { data: dcPatients, error: pErr } = await supabase
      .from("drchrono_patients")
      .select("drchrono_patient_id, first_name, last_name, email, cell_phone, date_of_birth, address, city, state, zip_code, default_pharmacy")
      .order("last_name", { ascending: true });

    if (pErr) {
      return NextResponse.json({ error: "Patients: " + pErr.message }, { status: 500 });
    }
    console.log(`[Export] ${dcPatients?.length || 0} patients`);

    // ── 2. Get ALL medications (bulk) ────────────────────────
    const { data: allMeds, error: mErr } = await supabase
      .from("drchrono_medications")
      .select("drchrono_patient_id, name, dosage_quantity, dosage_unit, sig, frequency, status, date_prescribed, date_stopped_taking")
      .order("date_prescribed", { ascending: false });

    if (mErr) console.error("[Export] Meds error:", mErr.message);
    console.log(`[Export] ${allMeds?.length || 0} medications`);

    // ── 3. Get ALL allergies (bulk) ──────────────────────────
    const { data: allAllergies, error: aErr } = await supabase
      .from("drchrono_allergies")
      .select("drchrono_patient_id, description, reaction, status, notes")
      .order("description", { ascending: true });

    if (aErr) console.error("[Export] Allergies error:", aErr.message);

    // ── 4. Build lookup maps ─────────────────────────────────
    const medsMap = new Map<number, any[]>();
    for (const m of allMeds || []) {
      if (!medsMap.has(m.drchrono_patient_id)) medsMap.set(m.drchrono_patient_id, []);
      medsMap.get(m.drchrono_patient_id)!.push(m);
    }

    const allergiesMap = new Map<number, any[]>();
    for (const a of allAllergies || []) {
      if (!allergiesMap.has(a.drchrono_patient_id)) allergiesMap.set(a.drchrono_patient_id, []);
      allergiesMap.get(a.drchrono_patient_id)!.push(a);
    }

    // ── 5. Build patient array ───────────────────────────────
    const patients = (dcPatients || []).map((p) => {
      const dcId = p.drchrono_patient_id;
      const meds = medsMap.get(dcId) || [];
      const allergies = allergiesMap.get(dcId) || [];

      return {
        drchrono_patient_id: dcId,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: (p.email || "").toLowerCase(),
        phone: p.cell_phone || "",
        date_of_birth: p.date_of_birth || "",
        address: [p.address, p.city, p.state, p.zip_code].filter(Boolean).join(", "),
        pharmacy: p.default_pharmacy || "",
        medications: meds.map((m: any) => ({
          name: m.name || "",
          dosage: [m.dosage_quantity, m.dosage_unit].filter(Boolean).join(" ") || "",
          sig: m.sig || m.frequency || "",
          status: m.status || "unknown",
          date_prescribed: m.date_prescribed || "",
          date_stopped: m.date_stopped_taking || null,
        })),
        allergies: allergies.map((a: any) => ({
          name: a.description || "",
          reaction: a.reaction || a.notes || "",
          status: a.status || "active",
        })),
      };
    });

    // ── 6. Build the export ──────────────────────────────────
    const totalMeds = patients.reduce((s, p) => s + p.medications.length, 0);
    const totalAllergies = patients.reduce((s, p) => s + p.allergies.length, 0);

    const exportData = {
      generated_at: new Date().toISOString(),
      version: "1.0",
      summary: {
        total_patients: patients.length,
        total_medications: totalMeds,
        total_allergies: totalAllergies,
        patients_with_medications: patients.filter(p => p.medications.length > 0).length,
      },
      patients,
    };

    // ── 7. Save to /public/data/ ─────────────────────────────
    try {
      const dataDir = join(process.cwd(), "public", "data");
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

      const filePath = join(dataDir, "patient-medications.json");
      writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      console.log(`[Export] Saved to ${filePath}`);
    } catch (fsErr: any) {
      // On Vercel, can't write to filesystem — that's OK, still return the data
      console.log("[Export] Can't write file (serverless):", fsErr.message);
    }

    // ── 8. Also save to Supabase for persistence ─────────────
    try {
      const { error: saveErr } = await supabase
        .from("patient_data_exports")
        .upsert({
          id: "00000000-0000-0000-0000-000000000001", // Single row, always overwrite
          export_type: "full_patient_data",
          generated_at: new Date().toISOString(),
          summary: exportData.summary,
          patient_count: patients.length,
          medication_count: totalMeds,
          data: patients,
        });
      if (saveErr) console.log("[Export] Supabase save note:", saveErr.message);
      else console.log("[Export] Saved to Supabase");
    } catch {
      console.log("[Export] Supabase save skipped");
    }

    const duration = Date.now() - startTime;
    console.log(`[Export] Done: ${patients.length} patients, ${totalMeds} meds in ${duration}ms`);

    return NextResponse.json({
      success: true,
      summary: exportData.summary,
      duration_ms: duration,
      file: "/data/patient-medications.json",
    });
  } catch (err: any) {
    console.error("[Export] FATAL:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

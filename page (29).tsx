// ═══════════════════════════════════════════════════════════════
// MEDICATIONS FROM EXPORT — Offline fallback
//
// GET /api/medications-from-export?email=xxx&patientId=xxx
//
// Priority:
//   1. Static JSON file (/public/data/patient-medications.json) — NO internet needed
//   2. Supabase patient_data_exports table — needs Supabase only
//   3. Returns empty if neither available
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Cache the static file in memory after first load
let cachedPatients: any[] | null = null;
let cacheLoadedAt: string | null = null;

function loadStaticFile(): any[] | null {
  if (cachedPatients) return cachedPatients;

  try {
    const filePath = join(process.cwd(), "public", "data", "patient-medications.json");
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      cachedPatients = data.patients || [];
      cacheLoadedAt = data.generated_at || "unknown";
      console.log(`[MedsExport] Loaded static file: ${cachedPatients!.length} patients`);
      return cachedPatients;
    }
  } catch (e) {
    console.log("[MedsExport] Static file not available:", (e as Error).message);
  }
  return null;
}

async function loadFromSupabase(): Promise<any[] | null> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: exportRow } = await supabase
      .from("patient_data_exports")
      .select("data, generated_at")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (exportRow?.data) {
      cacheLoadedAt = exportRow.generated_at;
      return exportRow.data as any[];
    }
  } catch (e) {
    console.log("[MedsExport] Supabase fallback failed:", (e as Error).message);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  const patientId = req.nextUrl.searchParams.get("patientId");

  if (!email && !patientId) {
    return NextResponse.json({ error: "email or patientId required" }, { status: 400 });
  }

  // Try static file first (works offline), then Supabase
  let patients = loadStaticFile();
  let source = "static_file";

  if (!patients) {
    patients = await loadFromSupabase();
    source = "supabase_export";
  }

  if (!patients || patients.length === 0) {
    return NextResponse.json({
      medications: [],
      count: 0,
      source: "none",
      error: "No export data available. Run /api/generate-export or deploy with static JSON.",
    });
  }

  // Find the patient
  let patientRecord: any = null;

  if (email) {
    patientRecord = patients.find((p: any) => (p.email || "").toLowerCase() === email);
  }

  if (!patientRecord && patientId) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: pt } = await supabase
        .from("patients")
        .select("drchrono_patient_id, email")
        .eq("id", patientId)
        .single();

      if (pt?.drchrono_patient_id) {
        patientRecord = patients.find((p: any) => p.drchrono_patient_id === pt.drchrono_patient_id);
      }
      if (!patientRecord && pt?.email) {
        patientRecord = patients.find((p: any) => (p.email || "").toLowerCase() === pt.email.toLowerCase());
      }
    } catch {
      // Supabase not available for patient lookup — can't resolve patientId without it
    }
  }

  if (!patientRecord) {
    return NextResponse.json({
      medications: [],
      count: 0,
      source,
      generated_at: cacheLoadedAt,
    });
  }

  // Deduplicate by medication name
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
    source,
    generated_at: cacheLoadedAt,
    patient_name: `${patientRecord.first_name} ${patientRecord.last_name}`.trim(),
  });
}

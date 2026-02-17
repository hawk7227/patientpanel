// ═══════════════════════════════════════════════════════════════
// GENERATE PATIENT DATA EXPORT — Full backup with ALL data
//
// GET /api/generate-export
// Fetches ALL patients + medications + allergies + problems + appointments
// Paginated past 1000-row Supabase limit
// Saves to Supabase patient_data_exports + static JSON
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchAll(table: string, select: string, orderBy: string = "id") {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error(`[Export] ${table} error at ${offset}:`, error.message); break; }
    if (data && data.length > 0) { allRows = allRows.concat(data); offset += data.length; hasMore = data.length === PAGE_SIZE; }
    else hasMore = false;
  }
  return allRows;
}

function buildMap(rows: any[], key: string): Map<number, any[]> {
  const map = new Map<number, any[]>();
  for (const r of rows) {
    const id = r[key];
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(r);
  }
  return map;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("[Export] Starting full export (patients + meds + allergies + problems + appointments)...");

    // ── 1. Patients ──────────────────────────────────────────
    const dcPatients = await fetchAll(
      "drchrono_patients",
      "drchrono_patient_id, first_name, last_name, email, cell_phone, date_of_birth, address, city, state, zip_code, default_pharmacy",
      "drchrono_patient_id"
    );
    console.log(`[Export] ${dcPatients.length} patients`);

    // ── 2. Medications ───────────────────────────────────────
    const allMeds = await fetchAll(
      "drchrono_medications",
      "drchrono_patient_id, name, dosage_quantity, dosage_unit, sig, frequency, status, date_prescribed, date_stopped_taking",
      "id"
    );
    console.log(`[Export] ${allMeds.length} medications`);

    // ── 3. Allergies ─────────────────────────────────────────
    const allAllergies = await fetchAll(
      "drchrono_allergies",
      "drchrono_patient_id, reaction, status, notes, severity, onset_date",
      "id"
    );
    console.log(`[Export] ${allAllergies.length} allergies`);

    // ── 4. Problems ──────────────────────────────────────────
    const allProblems = await fetchAll(
      "drchrono_problems",
      "drchrono_patient_id, name, icd_code, status, date_diagnosis, date_changed",
      "id"
    );
    console.log(`[Export] ${allProblems.length} problems`);

    // ── 5. Appointments ──────────────────────────────────────
    const allAppts = await fetchAll(
      "drchrono_appointments",
      "drchrono_patient_id, scheduled_time, duration, status, reason, office, exam_room, doctor, notes, created_at",
      "id"
    );
    console.log(`[Export] ${allAppts.length} appointments`);

    // ── 6. Build lookup maps ─────────────────────────────────
    const medsMap = buildMap(allMeds, "drchrono_patient_id");
    const allergiesMap = buildMap(allAllergies, "drchrono_patient_id");
    const problemsMap = buildMap(allProblems, "drchrono_patient_id");
    const apptsMap = buildMap(allAppts, "drchrono_patient_id");

    // ── 7. Build patient array ───────────────────────────────
    const patients = dcPatients.map((p: any) => {
      const dcId = p.drchrono_patient_id;
      return {
        drchrono_patient_id: dcId,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: (p.email || "").toLowerCase(),
        phone: p.cell_phone || "",
        date_of_birth: p.date_of_birth || "",
        address: [p.address, p.city, p.state, p.zip_code].filter(Boolean).join(", "),
        pharmacy: p.default_pharmacy || "",
        medications: (medsMap.get(dcId) || []).map((m: any) => ({
          name: m.name || "",
          dosage: [m.dosage_quantity, m.dosage_unit].filter(Boolean).join(" ") || "",
          sig: m.sig || m.frequency || "",
          status: m.status || "unknown",
          date_prescribed: m.date_prescribed || "",
          date_stopped: m.date_stopped_taking || null,
        })),
        allergies: (allergiesMap.get(dcId) || []).map((a: any) => ({
          name: a.reaction || a.notes || "",
          severity: a.severity || "",
          status: a.status || "active",
          onset_date: a.onset_date || "",
        })),
        problems: (problemsMap.get(dcId) || []).map((pr: any) => ({
          name: pr.name || "",
          icd_code: pr.icd_code || "",
          status: pr.status || "active",
          date_diagnosis: pr.date_diagnosis || "",
          date_changed: pr.date_changed || "",
        })),
        appointments: (apptsMap.get(dcId) || []).map((ap: any) => ({
          scheduled_time: ap.scheduled_time || "",
          duration: ap.duration || 0,
          status: ap.status || "",
          reason: ap.reason || "",
          office: ap.office || "",
          doctor: ap.doctor || "",
          notes: ap.notes || "",
        })),
      };
    });

    // ── 8. Summary ───────────────────────────────────────────
    const totalMeds = patients.reduce((s: number, p: any) => s + p.medications.length, 0);
    const totalAllergies = patients.reduce((s: number, p: any) => s + p.allergies.length, 0);
    const totalProblems = patients.reduce((s: number, p: any) => s + p.problems.length, 0);
    const totalAppts = patients.reduce((s: number, p: any) => s + p.appointments.length, 0);

    const summary = {
      total_patients: patients.length,
      total_medications: totalMeds,
      total_allergies: totalAllergies,
      total_problems: totalProblems,
      total_appointments: totalAppts,
      patients_with_medications: patients.filter((p: any) => p.medications.length > 0).length,
      patients_with_allergies: patients.filter((p: any) => p.allergies.length > 0).length,
      patients_with_problems: patients.filter((p: any) => p.problems.length > 0).length,
    };

    // ── 9. Save to Supabase ──────────────────────────────────
    try {
      const { error: saveErr } = await supabase
        .from("patient_data_exports")
        .upsert({
          id: "00000000-0000-0000-0000-000000000001",
          export_type: "full_patient_data",
          generated_at: new Date().toISOString(),
          summary,
          patient_count: patients.length,
          medication_count: totalMeds,
          data: patients,
        });
      if (saveErr) console.log("[Export] Save error:", saveErr.message);
      else console.log("[Export] Saved to Supabase ✅");
    } catch (e: any) { console.log("[Export] Save skipped:", e.message); }

    const duration = Date.now() - startTime;
    console.log(`[Export] Done: ${patients.length} patients, ${totalMeds} meds, ${totalAllergies} allergies, ${totalProblems} problems, ${totalAppts} appts in ${duration}ms`);

    return NextResponse.json({ success: true, summary, duration_ms: duration });
  } catch (err: any) {
    console.error("[Export] FATAL:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

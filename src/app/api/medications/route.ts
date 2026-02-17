// ═══════════════════════════════════════════════════════════════
// MEDICATIONS API — Returns patient medications from ALL sources
//
// GET /api/medications?patientId=xxx
//
// Sources (in priority order):
//   1) drchrono_medications (via drchrono_patient_id) — MAIN source
//   2) patient_medications (local prescriptions by doctors)
//   3) medication_history (legacy table)
//   4) clinical_notes (prescriptions field)
//   5) appointments (chief_complaint/symptoms parsing)
//   6) patients table (current_medications, intake_data)
//   7) drchrono_medications via email fallback
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
  const skipWords = new Set(["none", "n/a", "no", "yes", "unknown", "other", "null", "undefined", ""]);

  const addMed = (name: string, dosage: string, source: string, active: boolean) => {
    const key = name.toLowerCase().trim();
    if (!key || key.length < 2 || key.length > 100 || seen.has(key) || skipWords.has(key)) return;
    seen.add(key);
    medications.push({ name: name.trim(), dosage, source, is_active: active });
  };

  // Get patient record for drchrono_patient_id + email
  let drchronoPatientId: number | null = null;
  let patientRecord: any = null;
  let patientEmail: string | null = null;

  try {
    const { data } = await supabase
      .from("patients")
      .select("drchrono_patient_id, current_medications, intake_data, email")
      .eq("id", patientId)
      .single();
    patientRecord = data;
    drchronoPatientId = data?.drchrono_patient_id || null;
    patientEmail = data?.email || null;
    console.log(`[Meds] Patient ${patientId}, drchrono_id: ${drchronoPatientId}, email: ${patientEmail}`);
  } catch (e) {
    console.log("[Meds] Patient lookup failed:", (e as Error).message);
  }

  try {
    // ═══ SOURCE 1: drchrono_medications (MAIN SOURCE) ═══════
    if (drchronoPatientId) {
      try {
        const { data: dcMeds, error } = await supabase
          .from("drchrono_medications")
          .select("name, dosage_quantity, dosage_unit, sig, frequency, status, date_prescribed, date_stopped_taking")
          .eq("drchrono_patient_id", drchronoPatientId)
          .order("date_prescribed", { ascending: false });

        console.log(`[Meds] S1 drchrono_medications: ${dcMeds?.length || 0} (err: ${error?.message || 'none'})`);
        for (const m of dcMeds || []) {
          const dosage = [m.dosage_quantity, m.dosage_unit, m.frequency].filter(Boolean).join(" ") || m.sig || "";
          addMed(m.name || "", dosage, "DrChrono", m.status !== "inactive" && !m.date_stopped_taking);
        }
      } catch (e) {
        console.log("[Meds] S1 skipped:", (e as Error).message);
      }
    }

    // ═══ SOURCE 2: patient_medications (doctor-added) ════════
    try {
      const { data: localMeds, error } = await supabase
        .from("patient_medications")
        .select("medication_name, name, dosage, sig, status, end_date")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      console.log(`[Meds] S2 patient_medications: ${localMeds?.length || 0} (err: ${error?.message || 'none'})`);
      for (const m of localMeds || []) {
        addMed(m.medication_name || m.name || "", m.dosage || m.sig || "", "Prescribed", m.status !== "inactive" && !m.end_date);
      }
    } catch (e) {
      console.log("[Meds] S2 skipped:", (e as Error).message);
    }

    // ═══ SOURCE 3: medication_history (legacy) ═══════════════
    try {
      const { data: history, error } = await supabase
        .from("medication_history")
        .select("medication_name, dosage, end_date")
        .eq("patient_id", patientId);

      console.log(`[Meds] S3 medication_history: ${history?.length || 0} (err: ${error?.message || 'none'})`);
      for (const m of history || []) {
        addMed(m.medication_name || "", m.dosage || "", "Records", !m.end_date);
      }
    } catch (e) {
      console.log("[Meds] S3 skipped:", (e as Error).message);
    }

    // ═══ SOURCE 4: clinical_notes ════════════════════════════
    try {
      const { data: notes } = await supabase
        .from("clinical_notes")
        .select("medications, prescriptions")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const n of notes || []) {
        for (const field of [n.medications, n.prescriptions]) {
          if (!field) continue;
          try {
            const parsed = typeof field === "string" ? JSON.parse(field) : field;
            if (Array.isArray(parsed)) {
              for (const m of parsed) {
                const name = typeof m === "string" ? m : (m.medication || m.name || m.drug || "");
                const dose = typeof m === "string" ? "" : (m.sig || m.dosage || "");
                if (name) addMed(name, dose, "Prescribed", true);
              }
            }
          } catch {
            String(field).split(/[,;\n]+/).forEach(line => {
              const c = line.replace(/^\d+[.)]\s*/, "").trim();
              if (c.length > 2) addMed(c, "", "Prescribed", true);
            });
          }
        }
      }
    } catch (e) {
      console.log("[Meds] S4 skipped:", (e as Error).message);
    }

    // ═══ SOURCE 5: appointments ══════════════════════════════
    try {
      const { data: appts } = await supabase
        .from("appointments")
        .select("symptoms, chief_complaint, service_type")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const a of appts || []) {
        const text = `${a.symptoms || ""} ${a.chief_complaint || ""}`;
        const matches = text.match(/(?:refill|rx refill|medication|prescribed|taking|current meds?)\s*:?\s*(.+)/gi);
        for (const match of matches || []) {
          const medsText = match.replace(/^(?:refill|rx refill|medication|prescribed|taking|current meds?)\s*:?\s*/i, "");
          medsText.split(/[,;]+/).forEach(part => {
            const c = part.replace(/\.\s*$/, "").trim();
            if (c.length > 2 && c.length < 80) addMed(c, "", "Visit", true);
          });
        }
      }
    } catch (e) {
      console.log("[Meds] S5 skipped:", (e as Error).message);
    }

    // ═══ SOURCE 6: patients table (current_medications) ══════
    if (patientRecord) {
      if (patientRecord.current_medications) {
        const meds = typeof patientRecord.current_medications === "string"
          ? patientRecord.current_medications.split(/[,;\n]+/)
          : Array.isArray(patientRecord.current_medications) ? patientRecord.current_medications : [];
        for (const m of meds) {
          const name = typeof m === "string" ? m.trim() : (m.name || "");
          if (name) addMed(name, "", "Intake", true);
        }
      }
      if (patientRecord.intake_data) {
        try {
          const intake = typeof patientRecord.intake_data === "string"
            ? JSON.parse(patientRecord.intake_data) : patientRecord.intake_data;
          const medsField = intake.medications || intake.current_medications || intake.currentMedications || [];
          const medsArr = typeof medsField === "string" ? medsField.split(/[,;\n]+/) : Array.isArray(medsField) ? medsField : [];
          for (const m of medsArr) {
            const name = typeof m === "string" ? m.trim() : (m.name || "");
            if (name) addMed(name, "", "Intake", true);
          }
        } catch {}
      }
    }

    // ═══ SOURCE 7: drchrono_medications via email fallback ═══
    // If drchrono_patient_id was null on patients table, try finding it via email
    if (!drchronoPatientId && patientEmail && medications.length === 0) {
      try {
        const { data: dcPatient } = await supabase
          .from("drchrono_patients")
          .select("drchrono_patient_id")
          .ilike("email", patientEmail)
          .limit(1)
          .single();

        if (dcPatient?.drchrono_patient_id) {
          console.log(`[Meds] S7 email fallback found drchrono_id: ${dcPatient.drchrono_patient_id}`);
          const { data: dcMeds } = await supabase
            .from("drchrono_medications")
            .select("name, dosage_quantity, dosage_unit, sig, frequency, status, date_stopped_taking")
            .eq("drchrono_patient_id", dcPatient.drchrono_patient_id)
            .order("date_prescribed", { ascending: false });

          for (const m of dcMeds || []) {
            const dosage = [m.dosage_quantity, m.dosage_unit, m.frequency].filter(Boolean).join(" ") || m.sig || "";
            addMed(m.name || "", dosage, "DrChrono", m.status !== "inactive" && !m.date_stopped_taking);
          }
        }
      } catch (e) {
        console.log("[Meds] S7 skipped:", (e as Error).message);
      }
    }

    const sources = [...new Set(medications.map(m => m.source))];
    console.log(`[Meds] TOTAL: ${medications.length} meds from [${sources.join(", ")}]`);

    return NextResponse.json({ medications, count: medications.length, sources });
  } catch (err: any) {
    console.error("[Meds] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

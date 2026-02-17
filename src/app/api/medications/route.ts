// ═══════════════════════════════════════════════════════════════
// MEDICATIONS API — Returns patient medications from 5 sources
//
// GET /api/medications?patientId=xxx
// Sources: 1) DrChrono API  2) medication_history  3) clinical_notes
//          4) appointments  5) intake form data
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
    if (!key || key.length < 2 || key.length > 100 || seen.has(key)) return;
    // Skip common non-medication words
    const skipWords = new Set(["none", "n/a", "no", "yes", "unknown", "other", "null", "undefined", ""]);
    if (skipWords.has(key)) return;
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
                "DrChrono",
                m.status !== "inactive"
              );
            }
          }
        }
      }
    } catch (e) {
      console.log("[Meds] DrChrono source skipped:", (e as Error).message);
    }

    // Source 2: Supabase medication_history table
    try {
      const { data: history } = await supabase
        .from("medication_history")
        .select("medication_name, dosage, end_date")
        .eq("patient_id", patientId);

      for (const m of history || []) {
        addMed(m.medication_name, m.dosage || "", "Records", !m.end_date);
      }
    } catch (e) {
      console.log("[Meds] medication_history skipped:", (e as Error).message);
    }

    // Source 3: Clinical notes (doctor prescriptions)
    try {
      const { data: notes } = await supabase
        .from("clinical_notes")
        .select("medications, assessment")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const n of notes || []) {
        // medications field could be JSON array or text
        if (n.medications) {
          try {
            const medsData = typeof n.medications === "string" ? JSON.parse(n.medications) : n.medications;
            if (Array.isArray(medsData)) {
              for (const m of medsData) {
                const name = typeof m === "string" ? m : (m.medication || m.name || m.drug || "");
                const dose = typeof m === "string" ? "" : (m.sig || m.dosage || m.dose || "");
                if (name) addMed(name, dose, "Prescribed", true);
              }
            }
          } catch {
            // Plain text — split by commas or newlines
            const lines = n.medications.split(/[,;\n]+/);
            for (const line of lines) {
              const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
              if (cleaned.length > 2) addMed(cleaned, "", "Prescribed", true);
            }
          }
        }
      }
    } catch (e) {
      console.log("[Meds] clinical_notes skipped:", (e as Error).message);
    }

    // Source 4: Appointment records (chief_complaint, symptoms)
    try {
      const { data: appts } = await supabase
        .from("appointments")
        .select("symptoms, chief_complaint, service_type")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const a of appts || []) {
        const text = `${a.symptoms || ""} ${a.chief_complaint || ""} ${a.service_type || ""}`;
        
        // Match patterns like "Rx Refill: Adderall 20mg, Xanax"
        const refillMatch = text.match(/(?:refill|rx refill|medication|prescribed|taking|current meds?)\s*:?\s*(.+)/gi);
        for (const match of refillMatch || []) {
          const medsText = match.replace(/^(?:refill|rx refill|medication|prescribed|taking|current meds?)\s*:?\s*/i, "");
          const parts = medsText.split(/[,;]+/);
          for (const part of parts) {
            const cleaned = part.replace(/\.\s*$/, "").trim();
            if (cleaned.length > 2 && cleaned.length < 80) addMed(cleaned, "", "Visit", true);
          }
        }
      }
    } catch (e) {
      console.log("[Meds] appointments source skipped:", (e as Error).message);
    }

    // Source 5: Patient intake data (current_medications field)
    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("current_medications, intake_data")
        .eq("id", patientId)
        .single();

      if (patient?.current_medications) {
        const meds = typeof patient.current_medications === "string"
          ? patient.current_medications.split(/[,;\n]+/)
          : Array.isArray(patient.current_medications)
            ? patient.current_medications
            : [];
        for (const m of meds) {
          const name = typeof m === "string" ? m.trim() : (m.name || m.medication || "");
          if (name) addMed(name, "", "Intake", true);
        }
      }

      if (patient?.intake_data) {
        try {
          const intake = typeof patient.intake_data === "string" ? JSON.parse(patient.intake_data) : patient.intake_data;
          const medsField = intake.medications || intake.current_medications || intake.currentMedications || [];
          const medsArr = typeof medsField === "string" ? medsField.split(/[,;\n]+/) : Array.isArray(medsField) ? medsField : [];
          for (const m of medsArr) {
            const name = typeof m === "string" ? m.trim() : (m.name || m.medication || "");
            if (name) addMed(name, "", "Intake", true);
          }
        } catch {}
      }
    } catch (e) {
      console.log("[Meds] patient intake skipped:", (e as Error).message);
    }

    console.log(`[Meds] Found ${medications.length} medications for patient ${patientId} from ${new Set(medications.map(m => m.source)).size} sources`);

    return NextResponse.json({ medications, count: medications.length });
  } catch (err: any) {
    console.error("[Meds] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

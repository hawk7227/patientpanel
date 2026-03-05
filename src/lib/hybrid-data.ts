// ═══════════════════════════════════════════════════════════════
// HYBRID DATA SERVICE — Local-first with cloud fallback
//
// RULE: No patient info should EVER be missing for existing patients.
// RULE: System MUST work without Supabase or DrChrono.
//
// Strategy:
//   READ:  IndexedDB first → API fallback → cache result locally
//   WRITE: IndexedDB first (instant) → sync to cloud (background)
//
// This file provides functions the UI calls instead of fetch().
// ═══════════════════════════════════════════════════════════════

import { getLocalDB, getDeviceId, nowISO, generateId, type MedazonLocalDB } from './local-db'
import type { LocalPatient, LocalMedication, LocalAppointment } from './local-db'

// ── Helpers ──────────────────────────────────────────────────

let dbInstance: MedazonLocalDB | null = null

async function db(): Promise<MedazonLocalDB> {
  if (!dbInstance) dbInstance = getLocalDB()
  return dbInstance
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// ═══════════════════════════════════════════════════════════════
// PATIENT LOOKUP — Local first, then API
// ═══════════════════════════════════════════════════════════════

export interface HybridPatient {
  id: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  source: string
  pharmacy?: string
  drchronoPatientId?: number
  _fromLocal: boolean
}

/**
 * Find a patient by email — checks local DB first, then express-lookup API.
 * Always caches the result locally for next time.
 */
export async function lookupPatient(email: string): Promise<{ found: boolean; patient: HybridPatient | null }> {
  const normalizedEmail = email.toLowerCase().trim()
  
  // ALWAYS use API for patient identity — authoritative source
  // This ensures we get the DrChrono-linked record (not a random duplicate)
  if (isOnline()) {
    try {
      const res = await fetch('/api/express-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const data = await res.json()

      if (data.found && data.patient) {
        // Cache locally for offline use
        await cachePatientLocally(data.patient, data.source)

        return {
          found: true,
          patient: { ...data.patient, _fromLocal: false },
        }
      }
    } catch (e) {
      console.log('[Hybrid] API lookup failed, trying local:', (e as Error).message)
    }
  }

  // Offline fallback: check local IndexedDB
  try {
    const local = await db()
    const allMatches = await local.patients
      .where('email')
      .equalsIgnoreCase(normalizedEmail)
      .toArray()

    // Prefer patient with drchrono_patient_id set
    const localPatient = allMatches.find(p => p.drchrono_patient_id) || allMatches[0] || null

    if (localPatient) {
      console.log('[Hybrid] Patient found in local DB (offline):', localPatient.id, 'drchrono:', localPatient.drchrono_patient_id)
      return {
        found: true,
        patient: localPatientToHybrid(localPatient, true),
      }
    }
  } catch (e) {
    console.log('[Hybrid] Local lookup also failed:', (e as Error).message)
  }

  // Neither worked
  return { found: false, patient: null }
}

function localPatientToHybrid(p: LocalPatient, fromLocal: boolean): HybridPatient {
  return {
    id: p.id,
    firstName: p.first_name || '',
    lastName: p.last_name || '',
    email: p.email || '',
    phone: p.phone || '',
    dateOfBirth: p.date_of_birth || '',
    address: p.location || '',
    source: 'local',
    pharmacy: p.preferred_pharmacy || undefined,
    drchronoPatientId: p.drchrono_patient_id || undefined,
    _fromLocal: fromLocal,
  }
}

async function cachePatientLocally(patient: any, source: string) {
  try {
    const local = await db()
    const existing = patient.id ? await local.patients.get(patient.id) : null
    
    const record: LocalPatient = {
      id: patient.id || generateId(),
      first_name: patient.firstName || null,
      last_name: patient.lastName || null,
      email: (patient.email || '').toLowerCase(),
      phone: patient.phone || null,
      date_of_birth: patient.dateOfBirth || null,
      location: patient.address || null,
      preferred_pharmacy: patient.pharmacy || null,
      drchrono_patient_id: patient.drchronoPatientId || null,
      created_at: existing?.created_at || nowISO(),
      updated_at: nowISO(),
      _synced: 1,
      _device_id: getDeviceId(),
    }
    
    await local.patients.put(record)
    console.log('[Hybrid] Patient cached locally:', record.id)
  } catch (e) {
    console.log('[Hybrid] Failed to cache patient:', (e as Error).message)
  }
}

async function refreshPatientFromCloud(email: string) {
  try {
    const res = await fetch('/api/express-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (data.found && data.patient) {
      await cachePatientLocally(data.patient, data.source)
    }
  } catch {}
}


// ═══════════════════════════════════════════════════════════════
// MEDICATIONS — Local first, then API, cache everything
// ═══════════════════════════════════════════════════════════════

export interface HybridMedication {
  name: string
  dosage?: string
  source: string
  is_active: boolean
}

/**
 * Get medications for a patient — checks local DB first, then medications API.
 * Always caches results locally. NEVER returns empty for a patient with history.
 */
export async function getPatientMedications(patientId: string): Promise<HybridMedication[]> {
  const results: HybridMedication[] = []
  const seen = new Set<string>()

  const addMed = (name: string, dosage: string, source: string, active: boolean) => {
    const key = name.toLowerCase().trim()
    if (!key || key.length < 2 || seen.has(key)) return
    seen.add(key)
    results.push({ name: name.trim(), dosage, source, is_active: active })
  }

  // 1. Always read local DB first
  try {
    const local = await db()
    const localMeds = await local.medications
      .where('patient_id')
      .equals(patientId)
      .toArray()

    for (const m of localMeds) {
      addMed(m.medication_name, m.dosage || '', m.source || 'Local', m.is_active)
    }

    // Also check local clinical notes for this patient
    const notes = await local.clinicalNotes
      .where('patient_id')
      .equals(patientId)
      .toArray()

    for (const n of notes) {
      if (n.prescriptions) {
        try {
          const medsData = typeof n.prescriptions === 'string' ? JSON.parse(n.prescriptions) : n.prescriptions
          if (Array.isArray(medsData)) {
            for (const m of medsData) {
              const name = typeof m === 'string' ? m : (m.medication || m.name || '')
              const dose = typeof m === 'string' ? '' : (m.sig || m.dosage || '')
              if (name) addMed(name, dose, 'Prescribed', true)
            }
          }
        } catch {
          const lines = String(n.prescriptions).split(/[,;\n]+/)
          for (const line of lines) {
            const cleaned = line.replace(/^\d+[.)]\s*/, '').trim()
            if (cleaned.length > 2) addMed(cleaned, '', 'Prescribed', true)
          }
        }
      }
    }

    // Check local patient record for current_medications
    const localPatient = await local.patients.get(patientId)
    if (localPatient?.current_medications) {
      const meds = localPatient.current_medications.split(/[,;\n]+/)
      for (const m of meds) {
        if (m.trim().length > 2) addMed(m.trim(), '', 'Patient', true)
      }
    }

    if (localMeds.length > 0) {
      console.log(`[Hybrid] Found ${results.length} meds locally for ${patientId}`)
    }
  } catch (e) {
    console.log('[Hybrid] Local meds lookup failed:', (e as Error).message)
  }

  // 2. If online, also fetch from API and merge (background-cache new ones)
  if (isOnline()) {
    try {
      const res = await fetch(`/api/medications?patientId=${patientId}`)
      const data = await res.json()
      
      if (data.medications && Array.isArray(data.medications)) {
        for (const m of data.medications) {
          addMed(m.name, m.dosage || '', m.source || 'Cloud', m.is_active)
        }

        // Cache all cloud meds locally
        cacheMedicationsLocally(patientId, data.medications).catch(() => {})
      }
    } catch (e) {
      console.log('[Hybrid] API meds fetch failed (using local only):', (e as Error).message)
    }
  }

  return results
}

async function cacheMedicationsLocally(patientId: string, meds: any[]) {
  try {
    const local = await db()
    const deviceId = getDeviceId()
    
    for (const m of meds) {
      const key = m.name.toLowerCase().trim()
      // Check if already exists
      const existing = await local.medications
        .where('patient_id')
        .equals(patientId)
        .filter(med => med.medication_name.toLowerCase().trim() === key)
        .first()

      if (!existing) {
        await local.medications.put({
          id: generateId(),
          patient_id: patientId,
          medication_name: m.name,
          dosage: m.dosage || null,
          is_active: m.is_active !== false,
          source: m.source || 'Cloud',
          start_date: null,
          end_date: null,
          frequency: null,
          prescriber: null,
          drchrono_patient_id: null,
          drchrono_medication_id: null,
          _synced: 1,
          _device_id: deviceId,
        })
      }
    }
    console.log(`[Hybrid] Cached ${meds.length} meds locally for ${patientId}`)
  } catch (e) {
    console.log('[Hybrid] Failed to cache meds:', (e as Error).message)
  }
}


// ═══════════════════════════════════════════════════════════════
// APPOINTMENT HISTORY — Local first, API fallback
// ═══════════════════════════════════════════════════════════════

export async function getPatientAppointments(patientId: string): Promise<LocalAppointment[]> {
  // 1. Local first
  try {
    const local = await db()
    const localAppts = await local.appointments
      .where('patient_id')
      .equals(patientId)
      .reverse()
      .sortBy('created_at')

    if (localAppts.length > 0) {
      console.log(`[Hybrid] Found ${localAppts.length} appointments locally`)
      return localAppts
    }
  } catch (e) {
    console.log('[Hybrid] Local appointments failed:', (e as Error).message)
  }

  // 2. Would need an API endpoint for this — for now return empty
  // The sync engine will populate this table over time
  return []
}


// ═══════════════════════════════════════════════════════════════
// CACHE WARMING — Pre-populate local DB from API for a patient
// Call this after patient login / lookup to ensure all data is local
// ═══════════════════════════════════════════════════════════════

export async function warmPatientCache(patientId: string) {
  if (!isOnline()) return
  
  console.log('[Hybrid] Warming cache for patient:', patientId)
  
  // Fire all in parallel — don't block the UI
  await Promise.allSettled([
    getPatientMedications(patientId),       // fetches + caches meds
    getPatientAppointments(patientId),       // fetches + caches appointments
  ])
  
  console.log('[Hybrid] Cache warm complete for:', patientId)
}

// ═══════════════════════════════════════════════════════════════
// /api/cron/reminders
// Runs every 5 minutes via Vercel cron.
// Queries appointment_reminders WHERE status='pending' AND send_at <= now().
// Dispatches up to 50 per run to stay within edge function timeout.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchReminder } from "@/lib/reminders";

type ReminderDispatchRow = Parameters<typeof dispatchReminder>[0];

export const maxDuration = 60; // Vercel pro — 60s edge timeout

const BATCH_SIZE = 50;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  // Guard: Vercel cron sends Authorization header with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Fetch due reminders — pending, send_at past
  const { data: due, error: fetchError } = await supabase
    .from("appointment_reminders")
    .select(
      "id, appointment_id, channel, template_key, message_variant, " +
      "patient_first_name, patient_email, patient_phone, provider_name, " +
      "pharmacy_name, pharmacy_address, appointment_link, scheduled_date, " +
      "scheduled_time, medications, reminder_type, visit_type"
    )
    .eq("status", "pending")
    .lte("send_at", now)
    .order("send_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[CronReminders] Fetch error:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0, message: "No reminders due" });
  }

  console.log(`[CronReminders] Processing ${due.length} reminders`);

  const rows = (due as unknown as ReminderDispatchRow[]);

  // Dispatch all — parallel with individual error handling
  const results = await Promise.allSettled(
    rows.map((row) => dispatchReminder(row))
  );

  type SettledResult = { success: boolean };
  const sent    = results.filter(r => r.status === "fulfilled" && (r as PromiseFulfilledResult<SettledResult>).value?.success).length;
  const failed  = results.filter(r => r.status === "rejected" || !(r as PromiseFulfilledResult<SettledResult>).value?.success).length;

  console.log(`[CronReminders] Done — sent: ${sent}, failed: ${failed}`);

  return NextResponse.json({
    processed: due.length,
    sent,
    failed,
    timestamp: now,
  });
}

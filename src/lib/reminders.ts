// ═══════════════════════════════════════════════════════════════
// lib/reminders.ts
// Schedule reminder chains and dispatch individual reminders.
// Called by create-appointment/route.ts after appointment insert.
// Called by /api/cron/reminders every 5 minutes.
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { sendSMS } from "@/lib/clicksend";
import { sendEmail } from "@/lib/email";

// ── Supabase (service role — cron runs server-side) ──────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ────────────────────────────────────────────────────
export type VisitTypeReminder = "video" | "phone" | "instant" | "async" | "refill";
export type ReminderType =
  | "confirmation"
  | "24hr"
  | "2hr"
  | "10min"
  | "status_change"
  | "no_show"
  | "post_visit";
export type ReminderChannel = "sms" | "email";

export interface ReminderContext {
  appointmentId: string;
  visitType: VisitTypeReminder;
  patientFirstName: string | null;
  patientEmail: string | null;
  patientPhone: string | null;
  providerName: string | null;
  pharmacyName: string | null;
  pharmacyAddress: string | null;
  accessToken: string | null;          // for building {link}
  requestedDateTime: string | null;    // ISO UTC — appointment time
  medications: string | null;          // comma-separated
}

interface ReminderRow {
  appointment_id: string;
  reminder_type: ReminderType;
  channel: ReminderChannel;
  visit_type: VisitTypeReminder;
  send_at: string;
  status: "pending";
  message_variant: 1 | 2 | 3;
  template_key: string;
  patient_first_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  provider_name: string | null;
  pharmacy_name: string | null;
  pharmacy_address: string | null;
  appointment_link: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  medications: string | null;
}

// ── Variant rotation — deterministic per appointment+type ────
function pickVariant(appointmentId: string, type: ReminderType): 1 | 2 | 3 {
  const hash = appointmentId.charCodeAt(0) + appointmentId.charCodeAt(1);
  const base = hash % 3; // 0, 1, 2
  // Shift by reminder type so confirmation vs 24hr get different variants
  const typeOffset: Record<ReminderType, number> = {
    confirmation: 0,
    "24hr": 1,
    "2hr": 2,
    "10min": 0,
    status_change: 1,
    no_show: 0,
    post_visit: 2,
  };
  return ((base + typeOffset[type]) % 3 + 1) as 1 | 2 | 3;
}

// ── Format appointment time for display ─────────────────────
function formatAppointmentTime(isoUtc: string): { date: string; time: string } {
  const d = new Date(isoUtc);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Phoenix",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const timeParts = new Intl.DateTimeFormat("en-US", options).formatToParts(d);
  const hour = timeParts.find(p => p.type === "hour")?.value ?? "12";
  const minute = timeParts.find(p => p.type === "minute")?.value ?? "00";
  const dayPeriod = timeParts.find(p => p.type === "dayPeriod")?.value ?? "AM";
  const timeStr = `${hour}:${minute} ${dayPeriod} AZ`;

  // Date in Phoenix TZ
  const phoenixDate = new Date(d.toLocaleString("en-US", { timeZone: "America/Phoenix" }));
  const dateStr = `${dayNames[phoenixDate.getDay()]}, ${monthNames[phoenixDate.getMonth()]} ${phoenixDate.getDate()}`;
  return { date: dateStr, time: timeStr };
}

// ── Build appointment link ───────────────────────────────────
function buildLink(accessToken: string | null): string {
  if (!accessToken) return "https://patient.medazonhealth.com";
  return `https://patient.medazonhealth.com/appointment/${accessToken}`;
}

// ── Schedule full reminder chain after appointment insert ────
export async function scheduleReminderChain(ctx: ReminderContext): Promise<void> {
  const supabase = getSupabase();
  const rows: ReminderRow[] = [];

  const link = buildLink(ctx.accessToken);
  const fmt = ctx.requestedDateTime ? formatAppointmentTime(ctx.requestedDateTime) : null;
  const apptTime = ctx.requestedDateTime ? new Date(ctx.requestedDateTime) : null;

  const base: Omit<ReminderRow, "reminder_type" | "channel" | "send_at" | "template_key" | "message_variant"> = {
    appointment_id: ctx.appointmentId,
    visit_type: ctx.visitType,
    status: "pending",
    patient_first_name: ctx.patientFirstName,
    patient_email: ctx.patientEmail,
    patient_phone: ctx.patientPhone,
    provider_name: ctx.providerName,
    pharmacy_name: ctx.pharmacyName,
    pharmacy_address: ctx.pharmacyAddress,
    appointment_link: link,
    scheduled_date: fmt?.date ?? null,
    scheduled_time: fmt?.time ?? null,
    medications: ctx.medications,
  };

  const push = (
    type: ReminderType,
    channel: ReminderChannel,
    sendAt: Date,
    templateKey: string
  ) => {
    rows.push({
      ...base,
      reminder_type: type,
      channel,
      send_at: sendAt.toISOString(),
      template_key: templateKey,
      message_variant: pickVariant(ctx.appointmentId, type),
    });
  };

  const now = new Date();

  // ── CONFIRMATION — all types, both channels, immediate ──
  push("confirmation", "sms", now, `confirmation_${ctx.visitType}_sms`);
  if (ctx.patientEmail) {
    push("confirmation", "email", now, `confirmation_${ctx.visitType}_email`);
  }

  // ── VIDEO + PHONE — time-based reminder chain ──
  if ((ctx.visitType === "video" || ctx.visitType === "phone") && apptTime) {
    const hr24 = new Date(apptTime.getTime() - 24 * 60 * 60 * 1000);
    const hr2  = new Date(apptTime.getTime() - 2  * 60 * 60 * 1000);
    const min10 = new Date(apptTime.getTime() - 10 * 60 * 1000);
    const noShow = new Date(apptTime.getTime() + 15 * 60 * 1000);
    const postVisit = new Date(apptTime.getTime() + 20 * 60 * 60 * 1000); // ~next day

    // Only schedule future reminders
    if (hr24 > now) {
      push("24hr", "sms",   hr24,  `24hr_${ctx.visitType}_sms`);
      if (ctx.patientEmail) push("24hr", "email", hr24, `24hr_${ctx.visitType}_email`);
    }
    if (hr2 > now) {
      push("2hr", "sms",    hr2,   `2hr_${ctx.visitType}_sms`);
      if (ctx.patientEmail) push("2hr", "email", hr2, `2hr_${ctx.visitType}_email`);
    }
    if (min10 > now) {
      push("10min", "sms",  min10, `10min_${ctx.visitType}_sms`);
    }
    // No-show — fires at appt+15min if status != completed (checked at send time)
    push("no_show", "sms", noShow, `no_show_sms`);

    // Post-visit
    push("post_visit", "sms", postVisit, `post_visit_${ctx.visitType}_sms`);
    if (ctx.patientEmail) push("post_visit", "email", postVisit, `post_visit_${ctx.visitType}_email`);
  }

  // ── ASYNC / INSTANT / REFILL — status-change driven ──
  // status_change rows are created here as placeholders with send_at = far future.
  // /api/trigger-reminder fires them early when status changes in doctor panel.
  if (ctx.visitType === "async" || ctx.visitType === "instant" || ctx.visitType === "refill") {
    const farFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7d — never fires unless triggered
    push("status_change", "sms", farFuture, `status_change_responded_sms`);
    push("status_change", "sms", farFuture, `status_change_rx_sent_sms`);
    if (ctx.patientEmail) {
      push("status_change", "email", farFuture, `status_change_responded_email`);
    }
    // Post-visit — 20hrs after creation (rough "next day")
    const postVisit = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    push("post_visit", "sms", postVisit, `post_visit_async_sms`);
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("appointment_reminders").insert(rows);
  if (error) {
    console.error("[Reminders] Failed to insert reminder chain:", error.message);
  } else {
    console.log(`[Reminders] Scheduled ${rows.length} reminders for appointment ${ctx.appointmentId}`);
  }
}

// ── Trigger a specific status-change reminder early ─────────
// Called from doctor panel when provider responds / Rx sent
export async function triggerStatusChangeReminder(
  appointmentId: string,
  templateKey: string
): Promise<void> {
  const supabase = getSupabase();
  const triggerAt = new Date(Date.now() + 60 * 1000); // fire in ~1 min
  const { error } = await supabase
    .from("appointment_reminders")
    .update({ send_at: triggerAt.toISOString() })
    .eq("appointment_id", appointmentId)
    .eq("template_key", templateKey)
    .eq("status", "pending");
  if (error) {
    console.error("[Reminders] triggerStatusChange failed:", error.message);
  }
}

// ── Template renderer ────────────────────────────────────────
interface TemplateVars {
  firstName: string;
  providerName: string;
  date: string;
  time: string;
  link: string;
  patientPhone: string;
  pharmacyName: string;
  pharmacyAddress: string;
  medications: string;
  price: string;
}

function renderTemplate(templateKey: string, variant: 1 | 2 | 3, vars: TemplateVars): string {
  const v = vars;
  const templates: Record<string, Record<1 | 2 | 3, string>> = {
    // ── CONFIRMATION ─────────────────────────────────────────
    confirmation_video_sms: {
      1: `Medazon Health: Your video visit with ${v.providerName} is confirmed for ${v.date} at ${v.time}. Join here when it's time: ${v.link}`,
      2: `Hi ${v.firstName} — your Medazon video visit is locked in for ${v.date} at ${v.time}. We'll remind you 2 hours and 10 minutes before. Your link: ${v.link}`,
      3: `Confirmed ✓ Video visit with ${v.providerName} on ${v.date} at ${v.time}. Tap to view: ${v.link}`,
    },
    confirmation_phone_sms: {
      1: `Medazon Health: Your phone visit with ${v.providerName} is confirmed for ${v.date} at ${v.time}. Your provider will call ${v.patientPhone}. No link needed — just be available.`,
      2: `Hi ${v.firstName} — your Medazon phone visit is set for ${v.date} at ${v.time}. ${v.providerName} will call you at ${v.patientPhone}. Make sure your ringer is on.`,
      3: `Confirmed ✓ Phone visit with ${v.providerName} on ${v.date} at ${v.time}. We'll call ${v.patientPhone}. Keep your phone nearby.`,
    },
    confirmation_instant_sms: {
      1: `Medazon Health: Your instant visit request has been received. A provider is reviewing your case now and will respond within 15–30 min during business hours. View: ${v.link}`,
      2: `Hi ${v.firstName} — got it! Your provider is reviewing your intake now. You'll receive a text the moment they respond. Track here: ${v.link}`,
      3: `Confirmed ✓ Your Medazon instant visit is in queue. Provider will review shortly. We'll notify you when they respond. No need to stay on the page.`,
    },
    confirmation_async_sms: {
      1: `Medazon Health: Your message has been sent to ${v.providerName}. They'll review and respond within 1–2 hours during business hours. View: ${v.link}`,
      2: `Hi ${v.firstName} — your note to your provider is in. Responses typically arrive within 1–2 business hours. We'll text you the moment they respond.`,
      3: `Confirmed ✓ Your provider is reviewing your message. No need to wait by your phone. We'll notify you when ${v.providerName} responds.`,
    },
    confirmation_refill_sms: {
      1: `Medazon Health: Your Rx refill request has been received. A provider is reviewing and will send your prescription to ${v.pharmacyName} within 1–2 hours during business hours. View: ${v.link}`,
      2: `Hi ${v.firstName} — your refill request for ${v.medications} is under review. You'll get a text once your prescription is sent to ${v.pharmacyName}. Track: ${v.link}`,
      3: `Confirmed ✓ Rx refill request received. Provider reviewing now. Prescription will be sent to ${v.pharmacyName} if approved. We'll text you with updates.`,
    },

    // ── 24HR ─────────────────────────────────────────────────
    "24hr_video_sms": {
      1: `Reminder: Your video visit with ${v.providerName} is tomorrow at ${v.time}. Your link: ${v.link} — test your camera/mic ahead of time.`,
      2: `Hi ${v.firstName}, heads up — your Medazon video visit is in 24 hours (${v.date} at ${v.time}). Tap to join when it's time: ${v.link}`,
      3: `24-hour reminder: Video visit with ${v.providerName} on ${v.date} at ${v.time}. We recommend joining 2–3 minutes early. Link: ${v.link}`,
    },
    "24hr_phone_sms": {
      1: `Reminder: Your phone visit with ${v.providerName} is tomorrow at ${v.time}. Make sure you're reachable at ${v.patientPhone}.`,
      2: `Hi ${v.firstName} — your Medazon phone visit is in 24 hours. ${v.providerName} will call ${v.patientPhone} at ${v.time} on ${v.date}. Keep your ringer on.`,
      3: `24-hour reminder: Phone consultation tomorrow at ${v.time}. We'll call you at ${v.patientPhone}. If that number is wrong, visit ${v.link} to update it.`,
    },

    // ── 2HR ──────────────────────────────────────────────────
    "2hr_video_sms": {
      1: `Your video visit with ${v.providerName} starts in 2 hours at ${v.time}. Tap to join: ${v.link}. Find a quiet spot with good wifi.`,
      2: `2 hours away — your Medazon video visit with ${v.providerName} is at ${v.time}. Get your link ready: ${v.link}`,
      3: `Almost time ✓ Video visit in 2 hours (${v.time}). ${v.providerName} will be waiting. Join here: ${v.link}`,
    },
    "2hr_phone_sms": {
      1: `Your phone visit with ${v.providerName} is in 2 hours at ${v.time}. We'll call ${v.patientPhone} — keep your ringer on and phone nearby.`,
      2: `2 hours to go — ${v.providerName} will call you at ${v.patientPhone} at ${v.time}. Make sure you're in a place where you can talk freely.`,
      3: `Almost time ✓ Phone visit in 2 hours. Incoming call to ${v.patientPhone} at ${v.time}. Don't miss it.`,
    },

    // ── 10MIN ─────────────────────────────────────────────────
    "10min_video_sms": {
      1: `Your video visit with ${v.providerName} starts in 10 minutes. Join now: ${v.link}`,
      2: `10 min alert — tap to join your Medazon video visit: ${v.link}`,
      3: `${v.firstName}, your visit is starting soon. ${v.providerName} is ready. Join here: ${v.link}`,
    },
    "10min_phone_sms": {
      1: `Your phone visit starts in 10 minutes. Stay by your phone — ${v.providerName} will call ${v.patientPhone} shortly.`,
      2: `10 min alert — incoming call from Medazon Health to ${v.patientPhone} in 10 minutes. Be ready.`,
      3: `${v.firstName}, call in 10 minutes. ${v.providerName} is calling ${v.patientPhone}. Keep your line clear.`,
    },

    // ── STATUS CHANGE ─────────────────────────────────────────
    status_change_responded_sms: {
      1: `Your Medazon provider has responded to your visit. View their message and next steps: ${v.link}`,
      2: `Hi ${v.firstName} — ${v.providerName} has reviewed your case and left a response. Tap to read: ${v.link}`,
      3: `Update from Medazon ✓ Your provider responded. Check your visit summary here: ${v.link}`,
    },
    status_change_rx_sent_sms: {
      1: `Your prescription has been sent to ${v.pharmacyName}. Allow 2–4 hours for processing. Questions? Visit: ${v.link}`,
      2: `Good news — ${v.providerName} approved your Rx. It's been sent to ${v.pharmacyName}. Check status: ${v.link}`,
      3: `Prescription sent ✓ ${v.pharmacyName} will have your medication ready soon. Confirm pickup details: ${v.link}`,
    },

    // ── NO-SHOW ───────────────────────────────────────────────
    no_show_sms: {
      1: `Hi ${v.firstName}, we missed you at your ${v.time} visit with ${v.providerName}. Per our cancellation policy, your visit fee has been applied. To reschedule: ${v.link}`,
      2: `Medazon Health: Your appointment at ${v.time} was marked as a no-show. Your provider held time reserved for you. Per our policy, the visit fee is non-refundable. Reschedule: ${v.link}`,
      3: `We held your spot with ${v.providerName} at ${v.time} — unfortunately you weren't able to make it. Per our booking terms, the visit fee applies. Questions? Visit ${v.link}`,
    },

    // ── POST-VISIT ────────────────────────────────────────────
    post_visit_video_sms: {
      1: `Hi ${v.firstName}, how was your visit with ${v.providerName}? We'd love to hear your feedback: ${v.link}`,
      2: `Hope you're feeling better after your Medazon visit. If you have follow-up questions or need another visit: ${v.link}`,
      3: `Thank you for choosing Medazon Health. If ${v.providerName} sent any follow-up notes, view them here: ${v.link}`,
    },
    post_visit_phone_sms: {
      1: `Hi ${v.firstName}, how was your visit with ${v.providerName}? We'd love to hear your feedback: ${v.link}`,
      2: `Hope you're feeling better after your Medazon visit. Need a follow-up? Book easily here: ${v.link}`,
      3: `Thank you for choosing Medazon Health. View any follow-up notes from ${v.providerName} here: ${v.link}`,
    },
    post_visit_async_sms: {
      1: `Hi ${v.firstName}, your Medazon visit is complete. Hope everything went smoothly. Need a follow-up? Book here: ${v.link}`,
      2: `Checking in — did your prescription arrive at ${v.pharmacyName}? If you have any issues, reply HELP or visit: ${v.link}`,
      3: `Thank you for using Medazon Health. If you need to refill again or have follow-up questions, your portal is here: ${v.link}`,
    },
  };

  const group = templates[templateKey];
  if (!group) {
    console.warn(`[Reminders] No template found for key: ${templateKey}`);
    return `Hi ${v.firstName}, you have an update from Medazon Health. View here: ${v.link}`;
  }
  return group[variant] ?? group[1];
}

// ── Email subject lines ──────────────────────────────────────
function getEmailSubject(templateKey: string, vars: TemplateVars): string {
  if (templateKey.startsWith("confirmation_video")) return `Your video visit with ${vars.providerName} is confirmed`;
  if (templateKey.startsWith("confirmation_phone")) return `Your phone visit with ${vars.providerName} is confirmed`;
  if (templateKey.startsWith("confirmation_instant")) return `Your instant visit request is in queue`;
  if (templateKey.startsWith("confirmation_async")) return `Your message is under review`;
  if (templateKey.startsWith("confirmation_refill")) return `Your Rx refill request is under review`;
  if (templateKey.startsWith("24hr_video")) return `Reminder: Video visit tomorrow with ${vars.providerName}`;
  if (templateKey.startsWith("24hr_phone")) return `Reminder: Phone visit tomorrow with ${vars.providerName}`;
  if (templateKey.startsWith("2hr_video")) return `Your video visit starts in 2 hours`;
  if (templateKey.startsWith("2hr_phone")) return `Your phone visit starts in 2 hours`;
  if (templateKey.startsWith("10min")) return `Your visit starts in 10 minutes`;
  if (templateKey.startsWith("status_change_responded")) return `Your provider has responded`;
  if (templateKey.startsWith("status_change_rx")) return `Your prescription has been sent`;
  if (templateKey.startsWith("no_show")) return `We missed you at your appointment`;
  if (templateKey.startsWith("post_visit")) return `How was your Medazon visit?`;
  return `Update from Medazon Health`;
}

// ── Dispatch a single reminder row ──────────────────────────
export async function dispatchReminder(row: {
  id: string;
  channel: ReminderChannel;
  template_key: string;
  message_variant: 1 | 2 | 3;
  patient_first_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
  provider_name: string | null;
  pharmacy_name: string | null;
  pharmacy_address: string | null;
  appointment_link: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  medications: string | null;
  reminder_type: ReminderType;
  appointment_id: string;
  visit_type: VisitTypeReminder;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  // ── No-show guard: skip if appointment is completed ──
  if (row.reminder_type === "no_show") {
    const { data: appt } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", row.appointment_id)
      .single();
    if (appt?.status === "completed" || appt?.status === "cancelled") {
      await supabase
        .from("appointment_reminders")
        .update({ status: "skipped" })
        .eq("id", row.id);
      return { success: true };
    }
  }

  const vars: TemplateVars = {
    firstName:       row.patient_first_name  || "there",
    providerName:    row.provider_name       || "your provider",
    date:            row.scheduled_date      || "",
    time:            row.scheduled_time      || "",
    link:            row.appointment_link    || "https://patient.medazonhealth.com",
    patientPhone:    row.patient_phone       || "",
    pharmacyName:    row.pharmacy_name       || "your pharmacy",
    pharmacyAddress: row.pharmacy_address    || "",
    medications:     row.medications         || "your medication",
    price:           "$1.89",
  };

  const message = renderTemplate(row.template_key, row.message_variant, vars);

  try {
    if (row.channel === "sms" && row.patient_phone) {
      await sendSMS({ to: row.patient_phone, message });
    } else if (row.channel === "email" && row.patient_email) {
      const subject = getEmailSubject(row.template_key, vars);
      await sendEmail({
        to: row.patient_email,
        subject,
        html: `<p style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;">${message.replace(/\n/g, "<br/>")}</p>`,
        text: message,
      });
    } else {
      // No valid recipient — skip silently
      await supabase
        .from("appointment_reminders")
        .update({ status: "skipped" })
        .eq("id", row.id);
      return { success: true };
    }

    await supabase
      .from("appointment_reminders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", row.id);

    return { success: true };
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown send error";
    console.error(`[Reminders] dispatch failed for ${row.id}:`, errorMessage);
    await supabase
      .from("appointment_reminders")
      .update({ status: "failed", error_message: errorMessage })
      .eq("id", row.id);
    return { success: false, error: errorMessage };
  }
}

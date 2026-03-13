import { dailyService } from './daily';
/**
 * SMTP Email Integration using Nodemailer
 */

import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Check if SMTP is configured
 */
function isSMTPConfigured(): boolean {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  return !!(smtpHost && smtpUser && smtpPassword);
}

/**
 * Get missing SMTP environment variables
 */
function getMissingSMTPVars(): string[] {
  const missing: string[] = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASSWORD) missing.push("SMTP_PASSWORD");
  return missing;
}

/**
 * Create SMTP transporter
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    const missing = getMissingSMTPVars();
    throw new Error(
      `SMTP configuration is incomplete. Missing environment variables: ${missing.join(", ")}. ` +
      `Please configure these in your Vercel project settings under Settings > Environment Variables.`
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    requireTLS: smtpPort === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

/**
 * Send email via SMTP
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isSMTPConfigured()) {
    const missing = getMissingSMTPVars();
    const errorMessage = `SMTP not configured. Missing: ${missing.join(", ")}. Email sending is disabled.`;
    console.warn(errorMessage);
    return { success: false, error: errorMessage };
  }

  try {
    const transporter = createTransporter();
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!smtpFrom) {
      return { success: false, error: "SMTP_FROM not configured" };
    }

    const info = await transporter.sendMail({
      from: `"Medazon Health" <${smtpFrom}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ""),
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ─── Visit type helpers ────────────────────────────────────────────────────

function getVisitLabel(visitType: string): string {
  switch (visitType) {
    case "video":   return "Video Visit";
    case "phone":   return "Phone / SMS Visit";
    case "instant": return "Instant Care Visit";
    case "refill":  return "Rx Refill Request";
    default:        return "Telehealth Visit";
  }
}

function getVisitIcon(visitType: string): string {
  switch (visitType) {
    case "video":   return "📹";
    case "phone":   return "📞";
    case "instant": return "⚡";
    case "refill":  return "💊";
    default:        return "🏥";
  }
}

function getVisitBodyCopy(visitType: string, doctorName: string, appointmentDate: string, appointmentTime: string): string {
  switch (visitType) {
    case "video":
      return `Your video visit with ${doctorName} is confirmed for <strong>${appointmentDate} at ${appointmentTime} Arizona Time</strong>. At your appointment time, click the button below to join your secure video session. Make sure you're in a private, well-lit space with a stable internet connection.`;
    case "phone":
      return `Your phone visit with ${doctorName} is confirmed for <strong>${appointmentDate} at ${appointmentTime} Arizona Time</strong>. Your provider will call or text you at your registered number at the scheduled time. Keep your phone nearby and make sure it is charged.`;
    case "instant":
      return `Your instant care visit has been submitted and you are now in the queue. ${doctorName} will connect with you as soon as possible — typically within minutes during business hours. You will receive a notification when your provider is ready. Your scheduled window is <strong>${appointmentDate} at ${appointmentTime} Arizona Time</strong>.`;
    case "refill":
      return `Your Rx Refill request has been received and is being reviewed by ${doctorName}. Most refills are processed same day during business hours. You will receive a confirmation once your prescription has been sent to your pharmacy. Your scheduled review time is <strong>${appointmentDate} at ${appointmentTime} Arizona Time</strong>.`;
    default:
      return `Your appointment with ${doctorName} is confirmed for <strong>${appointmentDate} at ${appointmentTime} Arizona Time</strong>.`;
  }
}

function getNextSteps(visitType: string): string[] {
  switch (visitType) {
    case "video":
      return [
        "Check your email for your secure video link",
        "Join from your phone, tablet, or computer",
        "Your provider will connect with you at the scheduled time",
      ];
    case "phone":
      return [
        "Keep your phone on and nearby at appointment time",
        "Your provider will call or text your registered number",
        "If you miss the call, check your texts for a follow-up",
      ];
    case "instant":
      return [
        "You are in the queue — no further action needed",
        "You will be notified when your provider is ready",
        "Have your phone or device nearby to connect quickly",
      ];
    case "refill":
      return [
        "Your provider is reviewing your refill request",
        "You will receive a confirmation once it is sent to your pharmacy",
        "Most refills are completed same day during business hours",
      ];
    default:
      return [
        "Check your email for further instructions",
        "Contact support if you have any questions",
      ];
  }
}

/**
 * Generate patient appointment confirmation email HTML
 * Dark design — matches the /appointment/[token] page aesthetic
 */
export function generateAppointmentEmailHTML({
  doctorName,
  appointmentDate,
  appointmentTime,
  visitType,
  appointmentLink,
}: {
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: string;
  appointmentLink: string;
  smsMessage?: string;
}): string {
  const visitLabel = getVisitLabel(visitType);

  const visitTypeBadgeColor =
    visitType === "video"   ? "#1d4ed8" :
    visitType === "phone"   ? "#7c3aed" :
    visitType === "instant" ? "#b45309" :
    visitType === "refill"  ? "#065f46" : "#374151";

  const ctaLabel =
    visitType === "video"   ? "Click Here to Start Visit" :
    visitType === "phone"   ? "View Appointment Details" :
    visitType === "instant" ? "Track Your Visit Status" :
    visitType === "refill"  ? "Track Your Rx Status" : "View Appointment";

  const subheadline =
    visitType === "video"   ? `Your video visit with ${doctorName} is confirmed.` :
    visitType === "phone"   ? `Your phone visit with ${doctorName} is confirmed.` :
    visitType === "instant" ? `Your instant visit request is in queue. ${doctorName} will review shortly.` :
    visitType === "refill"  ? `Your Rx refill request is under review by ${doctorName}.` :
                              `Your visit with ${doctorName} is confirmed.`;

  const bodyNote =
    visitType === "video"
      ? `At your appointment time, click the button below to join your secure video session. Make sure you&#x2019;re in a private, well-lit space with a stable internet connection.`
    : visitType === "phone"
      ? `Your provider will call you at your registered number at the scheduled time. Keep your phone nearby and make sure it is charged. No link needed — just be available.`
    : visitType === "instant"
      ? `You will receive a notification when your provider responds. Typical response time is 15&#x2013;30 minutes during business hours. No need to stay on the page.`
    : visitType === "refill"
      ? `Most refills are processed same day during business hours. You will receive a text confirmation once your prescription has been sent to your pharmacy.`
    : `We&#x2019;ll send you reminders before your appointment. Contact support if you have any questions.`;

  const reminderPills =
    visitType === "video" || visitType === "phone"
      ? `<td style="padding: 0 4px;"><span style="display:inline-block;background:#1e3a2f;border:1px solid #166534;border-radius:999px;color:#86efac;font-size:11px;padding:3px 10px;">24 hr SMS</span></td>
         <td style="padding: 0 4px;"><span style="display:inline-block;background:#1e3a2f;border:1px solid #166534;border-radius:999px;color:#86efac;font-size:11px;padding:3px 10px;">2 hr SMS</span></td>
         <td style="padding: 0 4px;"><span style="display:inline-block;background:#1e3a2f;border:1px solid #166534;border-radius:999px;color:#86efac;font-size:11px;padding:3px 10px;">10 min SMS</span></td>`
      : `<td style="padding: 0 4px;"><span style="display:inline-block;background:#1e3a2f;border:1px solid #166534;border-radius:999px;color:#86efac;font-size:11px;padding:3px 10px;">Status updates via SMS</span></td>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed — Medazon Health</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0a0f1a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 20px 0; text-align: center;">
              <p style="margin: 0; color: #00cba9; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">Medazon Health</p>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background: #0d1628; border: 1px solid #1e3a5f; border-radius: 16px; overflow: hidden;">

              <!-- Card header — teal title -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid #1e293b;">
                    <h1 style="margin: 0 0 10px 0; color: #00cba9; font-size: 28px; font-weight: 800; letter-spacing: -0.01em;">Appointment Confirmed</h1>
                    <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.5;">${subheadline}</p>
                  </td>
                </tr>

                <!-- Date & Time -->
                <tr>
                  <td style="padding: 24px 40px; text-align: center; border-bottom: 1px solid #1e293b;">
                    <p style="margin: 0 0 6px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Date &amp; Time</p>
                    <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${appointmentDate} &nbsp;&bull;&nbsp; ${appointmentTime} AZ</p>
                  </td>
                </tr>

                <!-- Provider info -->
                <tr>
                  <td style="padding: 24px 40px; border-bottom: 1px solid #1e293b;">
                    <p style="margin: 0 0 14px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">Provider Information</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <div style="display: inline-block; background: #162032; border: 1px solid #1e3a5f; border-radius: 12px; padding: 16px 24px;">
                            <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 15px; font-weight: 700;">Medazon Health AZ &mdash; ${doctorName}</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 13px;">Board-Certified Family Nurse Practitioner</p>
                            <div style="margin-top: 10px;">
                              <span style="display: inline-block; background: ${visitTypeBadgeColor}22; border: 1px solid ${visitTypeBadgeColor}55; border-radius: 6px; color: #93c5fd; font-size: 12px; font-weight: 700; padding: 3px 12px; letter-spacing: 0.04em;">${visitLabel}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body note -->
                <tr>
                  <td style="padding: 20px 40px 24px; border-bottom: 1px solid #1e293b;">
                    <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.7; text-align: center;">${bodyNote}</p>
                  </td>
                </tr>

                <!-- Reminder pills -->
                <tr>
                  <td style="padding: 16px 40px; border-bottom: 1px solid #1e293b; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Reminders scheduled</p>
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>${reminderPills}</tr>
                    </table>
                  </td>
                </tr>

                <!-- Orange CTA -->
                <tr>
                  <td style="padding: 28px 40px 32px; text-align: center;">
                    <a href="${appointmentLink}" style="display: inline-block; background: #f97316; color: #ffffff; font-size: 16px; font-weight: 800; text-decoration: none; padding: 16px 48px; border-radius: 12px; letter-spacing: 0.01em; width: 80%; text-align: center; box-sizing: border-box;">${ctaLabel}</a>
                    <p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">We also sent it to you by SMS</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Legal footer -->
          <tr>
            <td style="padding: 20px 0 0 0; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #475569; font-size: 11px; line-height: 1.7;">
                Your $1.89 booking fee is non-refundable and reserves your provider&#x2019;s time slot. Your visit fee is held on your card and collected upon provider acceptance. No-shows and cancellations within 30 minutes of your scheduled appointment are non-refundable.
              </p>
              <p style="margin: 8px 0 0 0; color: #334155; font-size: 10px;">
                Medazon Health &middot; Telehealth Services &middot; Arizona, USA &middot; HIPAA Compliant &middot;
                <a href="mailto:support@medazonhealth.com" style="color: #475569;">support@medazonhealth.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate doctor appointment notification email HTML
 */
export function generateDoctorAppointmentEmailHTML({
  patientName,
  appointmentDate,
  appointmentTime,
  visitType,
  doctorPanelLink,
  zoomStartUrl,
  patientEmail,
  patientPhone,
  dailyMeetingUrl
}: {
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: string;
  doctorPanelLink: string;
  zoomStartUrl?: string | null;
  patientEmail?: string | null;
  patientPhone?: string | null;
  dailyMeetingUrl?: string | null;
}): string {
  const visitLabel = getVisitLabel(visitType);
  const visitIcon  = getVisitIcon(visitType);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New ${visitLabel} — Medazon Health</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a0f1a 0%, #0d1628 100%); border-radius: 16px 16px 0 0; padding: 32px 40px 28px;">
              <p style="margin: 0 0 4px 0; color: #00cba9; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">Medazon Health — Provider Alert</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; line-height: 1.2;">${visitIcon} New ${visitLabel}</h1>
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 14px;">A patient has booked a visit</p>
            </td>
          </tr>

          <!-- Patient details -->
          <tr>
            <td style="background: #ffffff; padding: 24px 40px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="background: #f9fafb; padding: 14px 20px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Patient & Appointment</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6; width: 40%;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Patient</p>
                          <p style="margin: 3px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${patientName}</p>
                        </td>
                        <td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Visit Type</p>
                          <p style="margin: 3px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${visitLabel}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Date</p>
                          <p style="margin: 3px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${appointmentDate}</p>
                        </td>
                        <td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Time (AZ)</p>
                          <p style="margin: 3px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${appointmentTime}</p>
                        </td>
                      </tr>
                      ${patientEmail ? `
                      <tr>
                        <td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Email</p>
                          <p style="margin: 3px 0 0 0; color: #111827; font-size: 14px;">${patientEmail}</p>
                        </td>
                        ${patientPhone ? `<td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;">Phone</p>
                          <p style="margin: 3px 0 0 0; color: #111827; font-size: 14px;">${patientPhone}</p>
                        </td>` : '<td style="padding: 12px 20px; border-bottom: 1px solid #f3f4f6;"></td>'}
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Daily meeting link warning (if present) -->
          ${dailyMeetingUrl ? `
          <tr>
            <td style="background: #ffffff; padding: 20px 40px 0;">
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px;">
                <p style="margin: 0 0 6px 0; color: #92400e; font-size: 13px; font-weight: 700;">⚠️ Host-Only Start Link — Do Not Share With Patient</p>
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 12px; line-height: 1.5;">This link starts and controls the meeting. Only you should use it.</p>
                <a href="${dailyMeetingUrl}" style="color: #0066cc; font-size: 12px; word-break: break-all;">${dailyMeetingUrl}</a>
              </div>
            </td>
          </tr>` : ""}

          <!-- CTA -->
          <tr>
            <td style="background: #ffffff; padding: 24px 40px 8px; text-align: center;">
              <a href="${doctorPanelLink}" style="display: inline-block; background: linear-gradient(135deg, #00cba9 0%, #00b89a 100%); color: #000000; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px;">Open Doctor Panel →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #ffffff; padding: 20px 40px 0;">
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0;">
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 20px 40px 32px;">
              <p style="margin: 0 0 4px 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">This notification was sent to you as a Medazon Health provider. Patient information is protected under HIPAA.</p>
              <p style="margin: 0; color: #d1d5db; font-size: 10px;">Medazon Health · Arizona, USA · <a href="https://medazonhealth.com" style="color: #d1d5db;">medazonhealth.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

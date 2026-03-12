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
  smsMessage?: string; // kept for backward compat, not used
}): string {
  const visitLabel   = getVisitLabel(visitType);
  const visitIcon    = getVisitIcon(visitType);
  const bodyCopy     = getVisitBodyCopy(visitType, doctorName, appointmentDate, appointmentTime);
  const nextSteps    = getNextSteps(visitType);
  const showJoinBtn  = visitType === "video" || visitType === "instant";

  const nextStepsHtml = nextSteps
    .map(step => `
      <tr>
        <td style="padding: 6px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width: 22px; vertical-align: top; padding-top: 1px;">
                <span style="display: inline-block; width: 8px; height: 8px; background: #00cba9; border-radius: 50%; margin-top: 5px;"></span>
              </td>
              <td style="color: #4b5563; font-size: 14px; line-height: 1.5;">${step}</td>
            </tr>
          </table>
        </td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${visitLabel} Confirmation — Medazon Health</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a0f1a 0%, #0d1628 100%); border-radius: 16px 16px 0 0; padding: 32px 40px 28px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; color: #00cba9; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">Medazon Health</p>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.2;">${visitIcon} ${visitLabel}</h1>
                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 14px;">Booking confirmed</p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <div style="background: rgba(0,203,169,0.12); border: 1px solid rgba(0,203,169,0.25); border-radius: 8px; padding: 8px 14px; display: inline-block;">
                      <p style="margin: 0; color: #00cba9; font-size: 11px; font-weight: 700; letter-spacing: 0.06em;">CONFIRMED ✓</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Appointment details card -->
          <tr>
            <td style="background: #ffffff; padding: 0 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 12px; margin: 24px 0 0 0; overflow: hidden;">
                <tr>
                  <td style="background: #f9fafb; padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Appointment Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 14px 20px; border-bottom: 1px solid #f3f4f6; width: 40%;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;">Provider</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${doctorName}</p>
                        </td>
                        <td style="padding: 14px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;">Visit Type</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${visitLabel}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 14px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;">Date</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${appointmentDate}</p>
                        </td>
                        <td style="padding: 14px 20px; border-bottom: 1px solid #f3f4f6;">
                          <p style="margin: 0; color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;">Time (AZ)</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">${appointmentTime}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="background: #ffffff; padding: 24px 40px 8px;">
              <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.7;">${bodyCopy}</p>
            </td>
          </tr>

          <!-- Next steps -->
          <tr>
            <td style="background: #ffffff; padding: 20px 40px 8px;">
              <p style="margin: 0 0 12px 0; color: #111827; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">What happens next</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${nextStepsHtml}
              </table>
            </td>
          </tr>

          <!-- CTA button (video + instant only) -->
          ${showJoinBtn ? `
          <tr>
            <td style="background: #ffffff; padding: 24px 40px 8px; text-align: center;">
              <a href="${appointmentLink}" style="display: inline-block; background: linear-gradient(135deg, #00cba9 0%, #00b89a 100%); color: #000000; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; letter-spacing: 0.02em;">Join Your Visit →</a>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">Or copy this link: <a href="${appointmentLink}" style="color: #6b7280; word-break: break-all;">${appointmentLink}</a></p>
            </td>
          </tr>` : `
          <tr>
            <td style="background: #ffffff; padding: 24px 40px 8px;">
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px;">
                <p style="margin: 0; color: #6b7280; font-size: 13px;">Your appointment reference link: <a href="${appointmentLink}" style="color: #00cba9; font-weight: 600; word-break: break-all;">${appointmentLink}</a></p>
              </div>
            </td>
          </tr>`}

          <!-- Divider -->
          <tr>
            <td style="background: #ffffff; padding: 24px 40px 0;">
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 20px 40px 32px;">
              <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                Questions? Reply to this email or contact us at <a href="mailto:support@medazonhealth.com" style="color: #00cba9; text-decoration: none;">support@medazonhealth.com</a>.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; line-height: 1.6;">
                This message was sent to you because you booked a visit on Medazon Health. Your visit information is protected under HIPAA and is never shared without your consent.
              </p>
              <p style="margin: 12px 0 0 0; color: #d1d5db; font-size: 10px;">
                Medazon Health · Telehealth Services · Arizona, USA · <a href="https://medazonhealth.com" style="color: #d1d5db;">medazonhealth.com</a>
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

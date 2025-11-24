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
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    // For development/testing with self-signed certificates
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    // Additional options for better compatibility
    requireTLS: smtpPort === 587,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
  });
}

/**
 * Send email via SMTP
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check if SMTP is configured before attempting to send
  if (!isSMTPConfigured()) {
    const missing = getMissingSMTPVars();
    const errorMessage = `SMTP not configured. Missing: ${missing.join(", ")}. Email sending is disabled.`;
    console.warn(errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }

  try {
    const transporter = createTransporter();
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!smtpFrom) {
      return {
        success: false,
        error: "SMTP_FROM not configured",
      };
    }

    const info = await transporter.sendMail({
      from: `"Medazon Health" <${smtpFrom}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending email:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate appointment confirmation email HTML
 * Matches the format shown in the screenshot
 */
export function generateAppointmentEmailHTML({
  doctorName,
  appointmentDate,
  appointmentTime,
  visitType,
  zoomMeetingUrl,
  smsMessage,
}: {
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: string;
  zoomMeetingUrl?: string | null;
  smsMessage?: string;
}): string {
  const visitTypeDisplay = visitType === "video" ? "Video Visit" : visitType === "phone" ? "Phone Visit" : "Consultation";
  
  // Generate the SMS message content if not provided
  let smsContent = smsMessage;
  if (!smsContent) {
    smsContent = `You have a ${visitTypeDisplay} appointment with ${doctorName} on ${appointmentDate} at ${appointmentTime} AZ Time.`;
    if (zoomMeetingUrl) {
      smsContent += `\n\nYour ${visitTypeDisplay} link is: ${zoomMeetingUrl}`;
    }
  }
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your telemedicine appointment with ${doctorName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 20px 0; color: #333; font-size: 14px;">this is the SMS that the patent receive when booking</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #00cba9; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; white-space: pre-line;">"${smsContent}"</p>
          </div>
          
          ${zoomMeetingUrl ? `
          <div style="margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">Your ${visitTypeDisplay} link is: <a href="${zoomMeetingUrl}" style="color: #0066cc; text-decoration: underline;">${zoomMeetingUrl}</a></p>
          </div>
          ` : ""}
          
          <div style="margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">See you in 5 minutes on Medazon! Please use the link sent to your email/text.</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #666; font-size: 12px;">Reply STOP to unsubscribe.</p>
          </div>
        </div>
      </body>
    </html>
  `;
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
  zoomMeetingUrl,
  patientEmail,
  patientPhone,
}: {
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: string;
  doctorPanelLink: string;
  zoomMeetingUrl?: string | null;
  patientEmail?: string | null;
  patientPhone?: string | null;
}): string {
  const visitTypeDisplay = visitType === "video" ? "Video Visit" : visitType === "phone" ? "Phone Visit" : "Consultation";
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Appointment Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0a0f1a; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: #00cba9; margin: 0 0 10px 0;">New Appointment Scheduled</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0;">Dear Doctor,</p>
          <p style="margin: 0 0 15px 0;">A new ${visitTypeDisplay} has been scheduled with patient ${patientName}.</p>
        </div>
        
        <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Appointment Details</h2>
          <p style="margin: 5px 0;"><strong>Patient:</strong> ${patientName}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0;"><strong>Type:</strong> ${visitTypeDisplay}</p>
          ${patientEmail ? `<p style="margin: 5px 0;"><strong>Patient Email:</strong> ${patientEmail}</p>` : ""}
          ${patientPhone ? `<p style="margin: 5px 0;"><strong>Patient Phone:</strong> ${patientPhone}</p>` : ""}
        </div>
        
        ${zoomMeetingUrl ? `
        <div style="background-color: #e8f5e9; border-left: 4px solid #00cba9; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Video Meeting Link:</strong></p>
          <p style="margin: 0;"><a href="${zoomMeetingUrl}" style="color: #00cba9; text-decoration: none;">${zoomMeetingUrl}</a></p>
        </div>
        ` : ""}
        
        <div style="background-color: #0a0f1a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <a href="${doctorPanelLink}" style="display: inline-block; background-color: #00cba9; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Doctor Panel</a>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;">Please review the appointment details in your doctor panel.</p>
          <p style="margin: 10px 0 0 0;">Medazon Health AZ</p>
        </div>
      </body>
    </html>
  `;
}


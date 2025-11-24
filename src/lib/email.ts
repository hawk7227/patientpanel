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
 * Create SMTP transporter
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    throw new Error("SMTP configuration is incomplete. Please check your environment variables.");
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
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate appointment confirmation email HTML
 */
export function generateAppointmentEmailHTML({
  patientName,
  appointmentDate,
  appointmentTime,
  visitType,
  appointmentLink,
  zoomMeetingUrl,
}: {
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: string;
  zoomMeetingUrl?: string | null;
  appointmentLink: string;
}): string {
  const visitTypeDisplay = visitType === "video" ? "Video Visit" : visitType === "phone" ? "Phone Visit" : "Consultation";
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0a0f1a; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: #00cba9; margin: 0 0 10px 0;">Appointment Confirmed</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0;">Dear ${patientName},</p>
          <p style="margin: 0 0 15px 0;">Your ${visitTypeDisplay} has been successfully scheduled.</p>
        </div>
        
        <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Appointment Details</h2>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0;"><strong>Type:</strong> ${visitTypeDisplay}</p>
        </div>
        
        ${zoomMeetingUrl ? `
        <div style="background-color: #e8f5e9; border-left: 4px solid #00cba9; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Video Meeting Link:</strong></p>
          <p style="margin: 0;"><a href="${zoomMeetingUrl}" style="color: #00cba9; text-decoration: none;">${zoomMeetingUrl}</a></p>
        </div>
        ` : ""}
        
        <div style="background-color: #0a0f1a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <a href="${appointmentLink}" style="display: inline-block; background-color: #00cba9; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Appointment Details</a>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 12px; color: #666;">
          <p style="margin: 0;">If you have any questions or need to reschedule, please contact us.</p>
          <p style="margin: 10px 0 0 0;">Medazon Health AZ</p>
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


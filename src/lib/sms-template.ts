/**
 * SMS Template System
 * 
 * Allows customization of SMS messages via environment variable or default template
 * 
 * Placeholders:
 * - {patientName} - Patient's first name
 * - {fullName} - Patient's full name
 * - {appointmentDate} - Formatted appointment date
 * - {appointmentTime} - Formatted appointment time
 * - {visitType} - Visit type (Video Visit, Phone Visit, Consultation)
 * - {appointmentLink} - Link to appointment page
 * - {zoomMeetingUrl} - Zoom meeting URL (if video appointment)
 */

interface SMSTemplateVariables {
  patientName: string;
  fullName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: string;
  visitTypeDisplay: string;
  appointmentLink: string;
  zoomMeetingUrl?: string | null;
}

/**
 * Default SMS template
 */
const DEFAULT_SMS_TEMPLATE = `Hi {patientName}, your {visitTypeDisplay} is confirmed for {appointmentDate} at {appointmentTime}. View details: {appointmentLink}{zoomMeetingUrl}`;

/**
 * Generate SMS message from template
 */
export function generateSMSMessage(variables: SMSTemplateVariables): string {
  // Get custom template from environment variable, or use default
  const template = process.env.SMS_TEMPLATE || DEFAULT_SMS_TEMPLATE;

  let message = template;

  // Replace placeholders
  message = message.replace(/{patientName}/g, variables.patientName);
  message = message.replace(/{fullName}/g, variables.fullName);
  message = message.replace(/{appointmentDate}/g, variables.appointmentDate);
  message = message.replace(/{appointmentTime}/g, variables.appointmentTime);
  message = message.replace(/{visitType}/g, variables.visitType);
  message = message.replace(/{visitTypeDisplay}/g, variables.visitTypeDisplay);
  message = message.replace(/{appointmentLink}/g, variables.appointmentLink);

  // Handle optional zoomMeetingUrl
  if (variables.zoomMeetingUrl) {
    message = message.replace(/{zoomMeetingUrl}/g, ` Join: ${variables.zoomMeetingUrl}`);
  } else {
    // Remove {zoomMeetingUrl} placeholder if no zoom URL
    message = message.replace(/\s*\{zoomMeetingUrl\}/g, '');
  }

  // Clean up any remaining placeholders (in case user forgot some)
  message = message.replace(/\{[^}]+\}/g, '');

  // Trim whitespace
  message = message.trim();

  return message;
}

/**
 * Get the current SMS template (for display/editing)
 */
export function getSMSTemplate(): string {
  return process.env.SMS_TEMPLATE || DEFAULT_SMS_TEMPLATE;
}












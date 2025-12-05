import { NextResponse } from "next/server";
import { getSMSTemplate } from "@/lib/sms-template";

/**
 * GET - Get current SMS template
 * POST - Update SMS template (via environment variable)
 */
export async function GET() {
  try {
    const template = getSMSTemplate();
    const customTemplate = process.env.SMS_TEMPLATE;

    return NextResponse.json({
      success: true,
      template,
      isCustom: !!customTemplate,
      placeholders: [
        "{patientName} - Patient's first name",
        "{fullName} - Patient's full name",
        "{appointmentDate} - Formatted appointment date",
        "{appointmentTime} - Formatted appointment time",
        "{visitType} - Visit type (video, phone, async)",
        "{visitTypeDisplay} - Visit type display (Video Visit, Phone Visit, Consultation)",
        "{appointmentLink} - Link to appointment page",
        "{zoomMeetingUrl} - Zoom meeting URL (only for video appointments)",
      ],
    });
  } catch (error: unknown) {
    console.error("Error getting SMS template:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}











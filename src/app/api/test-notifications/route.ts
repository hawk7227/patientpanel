import { NextResponse } from "next/server";
import { sendSMS } from "@/lib/clicksend";
import { generateSMSMessage, getSMSTemplate } from "@/lib/sms-template";
import { checkSMSStatus, getSMSHistory } from "@/lib/clicksend-status";
import { sendEmail, generateAppointmentEmailHTML } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { testType, email, phone } = await request.json();

    const results: {
      email?: { success: boolean; messageId?: string; error?: string };
      sms?: { success: boolean; messageId?: string; error?: string };
    } = {};

    // Get base URL for appointment link
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      const headers = request.headers;
      const host = headers.get('host');
      const protocol = headers.get('x-forwarded-proto') || 'https';
      baseUrl = host ? `${protocol}://${host}` : 'https://medazonhealth.com';
    }

    // Test email
    if (testType === "email" || testType === "both") {
      const testEmail = email || "fiverrsajjad@gmail.com";
      const testToken = "test-token-1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop";
      const appointmentLink = `${baseUrl}/appointment/${testToken}`;

      const testSMSMessage = `You have a Video Visit appointment with Dr. Test Doctor on Monday, December 1st at 10:00am AZ Time.\n\nYour appointment link is: ${appointmentLink}`;
      
      const emailHTML = generateAppointmentEmailHTML({
        doctorName: "Dr. Test Doctor",
        appointmentDate: "Monday, December 1, 2024",
        appointmentTime: "10:00 AM EST",
        visitType: "video",
        appointmentLink: appointmentLink,
        smsMessage: testSMSMessage,
      });

      results.email = await sendEmail({
        to: testEmail,
        subject: "Your telemedicine appointment with Dr. Test Doctor",
        html: emailHTML,
      });
    }

    // Test SMS
    if (testType === "sms" || testType === "both") {
      const testPhone = phone || "+9231334443536";
      const testToken = "test-token-1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop";
      const appointmentLink = `${baseUrl}/appointment/${testToken}`;

      // Generate SMS using template system
      const smsMessage = generateSMSMessage({
        patientName: "Test Patient",
        fullName: "Test Patient",
        appointmentDate: "Monday, December 1, 2024",
        appointmentTime: "10:00 AM EST",
        visitType: "video",
        visitTypeDisplay: "Video Visit",
        appointmentLink: appointmentLink,
        zoomMeetingUrl: null, // Don't include zoom link for patients
      });

      results.sms = await sendSMS({
        to: testPhone,
        message: smsMessage,
      });

      // Note: Status check is now done via getSMSHistory which searches for the message
      // ClickSend doesn't have a direct endpoint for single message status
      if (results.sms.success && results.sms.messageId) {
        console.log(`SMS sent with ID: ${results.sms.messageId}`);
        console.log("To check delivery status, use: /api/check-sms-status?messageId=" + results.sms.messageId);
        console.log("Or check ClickSend Dashboard: https://dashboard.clicksend.com/");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test notifications sent",
      results,
      baseUrl,
    });
  } catch (error: unknown) {
    console.error("Error in test-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get("type") || "both";
  const email = searchParams.get("email") || "fiverrsajjad@gmail.com";
  const phone = searchParams.get("phone") || "+9231334443536";

  try {
    const results: {
      email?: { success: boolean; messageId?: string; error?: string };
      sms?: { success: boolean; messageId?: string; error?: string };
    } = {};

    // Get base URL for appointment link
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      const headers = request.headers;
      const host = headers.get('host');
      const protocol = headers.get('x-forwarded-proto') || 'https';
      baseUrl = host ? `${protocol}://${host}` : 'https://medazonhealth.com';
    }

    // Test email
    if (testType === "email" || testType === "both") {
      const testToken = "test-token-1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop";
      const appointmentLink = `${baseUrl}/appointment/${testToken}`;

      const testSMSMessage = `You have a Video Visit appointment with Dr. Test Doctor on Monday, December 1st at 10:00am AZ Time.\n\nYour appointment link is: ${appointmentLink}`;
      
      const emailHTML = generateAppointmentEmailHTML({
        doctorName: "Dr. Test Doctor",
        appointmentDate: "Monday, December 1, 2024",
        appointmentTime: "10:00 AM EST",
        visitType: "video",
        appointmentLink: appointmentLink,
        smsMessage: testSMSMessage,
      });

      results.email = await sendEmail({
        to: email,
        subject: "Your telemedicine appointment with Dr. Test Doctor",
        html: emailHTML,
      });
    }

    // Test SMS
    if (testType === "sms" || testType === "both") {
      const testToken = "test-token-1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop";
      const appointmentLink = `${baseUrl}/appointment/${testToken}`;

      // Generate SMS using template system
      const smsMessage = generateSMSMessage({
        patientName: "Test Patient",
        fullName: "Test Patient",
        appointmentDate: "Monday, December 1, 2024",
        appointmentTime: "10:00 AM EST",
        visitType: "video",
        visitTypeDisplay: "Video Visit",
        appointmentLink: appointmentLink,
        zoomMeetingUrl: null, // Don't include zoom link for patients
      });

      results.sms = await sendSMS({
        to: phone,
        message: smsMessage,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Test notifications sent",
      results,
      baseUrl,
      testType,
      email,
      phone,
    });
  } catch (error: unknown) {
    console.error("Error in test-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}


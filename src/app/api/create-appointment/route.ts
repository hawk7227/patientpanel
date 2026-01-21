import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createZoomMeeting } from "@/lib/zoom";
import { sendSMS } from "@/lib/clicksend";
import { generateSMSMessage } from "@/lib/sms-template";
import {
  sendEmail,
  generateAppointmentEmailHTML,
  generateDoctorAppointmentEmailHTML,
} from "@/lib/email";
import Stripe from "stripe";
import { log } from "console";
import { dailyService } from "@/lib/daily";

// Dynamic import for waitUntil - works with or without @vercel/functions
let waitUntilFn: ((promise: Promise<unknown>) => void) | null = null;
try {
  // Try to load @vercel/functions for production background tasks
  const vercelFunctions = require("@vercel/functions");
  waitUntilFn = vercelFunctions.waitUntil;
} catch {
  // Package not installed - will use fallback approach
  waitUntilFn = null;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(request: Request) {
  try {
    const { payment_intent_id, appointmentData } = await request.json();

    console.log(
      "[CREATE_APPOINTMENT] Received request with appointment data.",
      appointmentData ? "Appointment data present." : "No appointment data.",
    );

    // Check if test mode is enabled (skip payment verification for local testing)
    const isTestMode =
      process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true" ||
      (process.env.NODE_ENV === "development" &&
        process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true");

    if (!payment_intent_id && !isTestMode) {
      return NextResponse.json(
        { error: "Payment intent ID is required" },
        { status: 400 },
      );
    }

    let paymentIntent: any = null;

    if (isTestMode) {
      // Test mode: Skip Stripe verification
      if (payment_intent_id && payment_intent_id.startsWith("pi_test_")) {
        paymentIntent = {
          id: payment_intent_id,
          status: "succeeded",
        };
      } else {
        paymentIntent = {
          id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          status: "succeeded",
        };
      }
    } else {
      // Production mode: Verify payment intent with Stripe
      if (!payment_intent_id) {
        return NextResponse.json(
          { error: "Payment intent ID is required" },
          { status: 400 },
        );
      }
      paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          { error: "Payment not successful", status: paymentIntent.status },
          { status: 400 },
        );
      }
    }

    // Check if appointment already exists for this payment intent
    const supabase = createServerClient();

    // Only check for existing appointment if we have a payment_intent_id
    let existingAppointment = null;
    if (payment_intent_id) {
      const { data, error } = await supabase
        .from("appointments")
        .select("id")
        .eq("payment_intent_id", payment_intent_id)
        .single();
      existingAppointment = data;
    }

    if (existingAppointment) {
      // Get the access token from existing appointment
      const { data: existingAppointmentWithToken } = await supabase
        .from("appointments")
        .select("id, access_token")
        .eq("id", existingAppointment.id)
        .single();

      return NextResponse.json({
        success: true,
        appointmentId: existingAppointment.id,
        accessToken: existingAppointmentWithToken?.access_token || null,
        message: "Appointment already created",
      });
    }

    // Parse appointment data
    const data = appointmentData || {};

    // CRITICAL: Match patient by email/name from form data first (current booking session)
    // This ensures we use the correct patient record that matches the form data
    // Only use patientId from form if the form data matches that patient
    let patientEmail = data.email || appointmentData?.email;
    let patientFirstName = data.firstName || appointmentData?.firstName;
    let patientLastName = data.lastName || appointmentData?.lastName;

    let patientData: any = null;
    let patientError: any = null;

    // First, try to find patient by email (most reliable match)
    if (patientEmail) {
      const { data: patientByEmail, error: emailError } = await supabase
        .from("patients")
        .select(
          "id, user_id, first_name, last_name, email, phone, date_of_birth, location, timezone",
        )
        .eq("email", patientEmail.toLowerCase().trim())
        .single();

      if (patientByEmail && !emailError) {
        // Verify the name matches (if provided in form)
        const nameMatches =
          (!patientFirstName ||
            patientByEmail.first_name === patientFirstName) &&
          (!patientLastName || patientByEmail.last_name === patientLastName);

        if (nameMatches) {
          patientData = patientByEmail;
          patientError = null;
        }
      }
    }

    // If not found by email or name doesn't match, try by patientId (but verify it matches form data)
    if (!patientData && data.patientId) {
      const { data: patientById, error: idError } = await supabase
        .from("patients")
        .select(
          "id, user_id, first_name, last_name, email, phone, date_of_birth, location, timezone",
        )
        .eq("id", data.patientId)
        .single();

      if (patientById && !idError) {
        // Verify the email/name matches form data
        const emailMatches =
          !patientEmail ||
          patientById.email?.toLowerCase().trim() ===
            patientEmail.toLowerCase().trim();
        const nameMatches =
          (!patientFirstName || patientById.first_name === patientFirstName) &&
          (!patientLastName || patientById.last_name === patientLastName);

        if (emailMatches && nameMatches) {
          patientData = patientById;
          patientError = null;
        }
      } else {
        patientError = idError;
      }
    }

    // If patient not found or doesn't match form data, create new patient from form data
    if (patientError || !patientData) {
      const patientPhone = data.phone || appointmentData?.phone;

      // #region agent log
      fetch(
        "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "create-appointment/route.ts:162",
            message: "Patient not found or mismatch, creating new patient",
            data: {
              formEmail: patientEmail,
              formFirstName: patientFirstName,
              formLastName: patientLastName,
              formPhone: patientPhone,
              existingPatientId: data.patientId,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        },
      ).catch(() => {});
      // #endregion

      // Only create if we have minimum required data
      if (patientEmail && patientFirstName && patientLastName && patientPhone) {
        // First, check/create user
        let userId: string | null = null;
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", patientEmail.toLowerCase().trim())
          .single();

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user
          const { data: newUser, error: createUserError } = await supabase
            .from("users")
            .insert({
              email: patientEmail.toLowerCase().trim(),
              first_name: patientFirstName,
              last_name: patientLastName,
              mobile_phone: patientPhone,
              date_of_birth: data.dateOfBirth || null,
              address: data.streetAddress || null,
            })
            .select("id")
            .single();

          if (newUser && !createUserError) {
            userId = newUser.id;
          }
        }

        // Create patient record
        if (userId) {
          const { data: newPatient, error: createPatientError } = await supabase
            .from("patients")
            .insert({
              user_id: userId,
              first_name: patientFirstName,
              last_name: patientLastName,
              email: patientEmail.toLowerCase().trim(),
              phone: patientPhone,
              date_of_birth: data.dateOfBirth || null,
              location: data.streetAddress || null,
              preferred_pharmacy: data.pharmacy || null,
              timezone: data.patientTimezone || "America/New_York",
            })
            .select(
              "id, user_id, first_name, last_name, email, phone, date_of_birth, location, timezone",
            )
            .single();

          if (newPatient && !createPatientError) {
            patientData = newPatient;
            patientError = null;
          }
        }
      }

      // If still no patient, return error
      if (patientError || !patientData) {
        return NextResponse.json(
          {
            error: "Patient not found",
            details:
              "Patient ID and email lookup both failed. Please ensure patient information is provided.",
          },
          { status: 404 },
        );
      }
    }

    // CRITICAL: Always use form data (current booking session) first, as it represents the patient's
    // ACTUAL current information for this appointment, not potentially stale DB values
    // Only fallback to DB values if form data is not provided
    // Add fallback to DB values if form data was not provided
    patientFirstName = patientFirstName || patientData?.first_name || null;
    patientLastName = patientLastName || patientData?.last_name || null;
    patientEmail = patientEmail || patientData?.email || null;
    const patientPhone =
      data.phone || appointmentData?.phone || patientData?.phone || null;
    const patientDob = data.dateOfBirth || patientData.date_of_birth || null;
    const patientLocation = data.streetAddress || patientData.location || null;
    // CRITICAL: Always use patientTimezone from request data (current booking session) first,
    // as it represents the patient's ACTUAL current timezone, not a potentially stale DB value
    // Only fallback to DB value if request doesn't provide it, then default to America/New_York
    const patientTimezone =
      data.patientTimezone || patientData.timezone || "America/New_York";

    // #region agent log
    fetch(
      "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "create-appointment/route.ts:220",
          message: "Patient timezone resolution",
          data: {
            dataPatientTimezone: data.patientTimezone,
            patientDataTimezone: patientData.timezone,
            resolvedPatientTimezone: patientTimezone,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "C",
        }),
      },
    ).catch(() => {});
    // #endregion

    // Doctor ID (hardcoded as specified)
    const DOCTOR_ID = "1fd1af57-5529-4d00-a301-e653b4829efc";

    // Verify doctor exists, create if doesn't exist, and get full doctor info
    const { data: existingDoctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, email, phone, first_name, last_name")
      .eq("id", DOCTOR_ID)
      .single();

    let doctorEmail = "doctor@medazonhealth.com";
    let doctorPhone = null;
    let doctorName = "Doctor";

    if (!existingDoctor) {
      // Doctor doesn't exist - return error
      return NextResponse.json(
        { error: "Doctor not found. Please contact support." },
        { status: 404 },
      );
    } else {
      // Use existing doctor info
      doctorEmail = existingDoctor.email || "doctor@medazonhealth.com";
      doctorPhone = existingDoctor.phone;
      if (existingDoctor.first_name && existingDoctor.last_name) {
        doctorName = `${existingDoctor.first_name} ${existingDoctor.last_name}`;
      }
    }

    // Combine date and time for requested_date_time
    // Patient selected time is in their LOCAL timezone, convert to Phoenix time for storage
    let requestedDateTime = null;

    // Get provider timezone (Phoenix) - CRITICAL: Must be America/Phoenix per requirements
    const { data: doctorInfo } = await supabase
      .from("doctors")
      .select("timezone")
      .eq("id", DOCTOR_ID)
      .single();

    // Always use America/Phoenix as the authoritative provider timezone (industry standard)
    // If doctor record has different timezone, log it but still use Phoenix
    const providerTimezone = "America/Phoenix";

    // #region agent log
    if (doctorInfo?.timezone && doctorInfo.timezone !== "America/Phoenix") {
      fetch(
        "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "create-appointment/route.ts:269",
            message: "Doctor timezone mismatch",
            data: {
              doctorRecordTimezone: doctorInfo.timezone,
              usingTimezone: providerTimezone,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        },
      ).catch(() => {});
    }
    // #endregion

    if (data.appointmentDate && data.appointmentTime) {
      // Parse date and time components (these are in patient's local timezone)
      const [year, month, day] = data.appointmentDate.split("-").map(Number);
      const [hours, minutes] = data.appointmentTime.split(":").map(Number);
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      // Patient timezone (from data or patient record)
      const patientTZ = patientTimezone || "America/New_York";

      // Convert patient's local time to Phoenix time
      // The correct approach: Create a date string in patient's timezone, parse it as local,
      // then convert to UTC, then format in Phoenix timezone

      // Step 1: Create a date string that represents the patient's local time
      // We'll use a date string in ISO format and parse it correctly
      const patientDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

      // Step 2: Create a date object that represents this time in the patient's timezone
      // We'll use a trick: create a date in UTC that, when formatted in patient timezone, gives us the right time
      // Then we can convert that UTC to Phoenix timezone

      // Create formatters for both timezones
      const patientFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: patientTZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const providerFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: providerTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // Step 3: Find the UTC time that represents the patient's selected time in their timezone
      // Use a more direct approach: create a date string and parse it correctly
      // We'll search around the expected UTC time based on timezone offset

      // Start with midnight UTC on the target date as a base
      const baseUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

      // Get what midnight UTC is in patient's timezone to understand the offset
      const basePatientParts = patientFormatter.formatToParts(baseUTC);
      const basePatientHour = parseInt(
        basePatientParts.find((p) => p.type === "hour")?.value || "0",
      );
      const basePatientDay = parseInt(
        basePatientParts.find((p) => p.type === "day")?.value || "0",
      );

      // Calculate approximate offset: if midnight UTC = X:00 in patient timezone
      // Then patient's selected time (hours:minutes) should be at UTC + (hours - basePatientHour) hours
      // But we need to account for date changes, so search more carefully
      let bestUTC: Date | null = null;

      // Search in a wider range to handle all timezones (up to +/- 30 hours to handle all cases)
      for (let offsetHours = -30; offsetHours <= 30; offsetHours++) {
        const testUTC = new Date(
          baseUTC.getTime() + offsetHours * 60 * 60 * 1000,
        );
        const testPatientParts = patientFormatter.formatToParts(testUTC);

        const testYear = parseInt(
          testPatientParts.find((p) => p.type === "year")?.value || "0",
        );
        const testMonth = parseInt(
          testPatientParts.find((p) => p.type === "month")?.value || "0",
        );
        const testDay = parseInt(
          testPatientParts.find((p) => p.type === "day")?.value || "0",
        );
        const testHour = parseInt(
          testPatientParts.find((p) => p.type === "hour")?.value || "0",
        );
        const testMinute = parseInt(
          testPatientParts.find((p) => p.type === "minute")?.value || "0",
        );

        if (
          testYear === year &&
          testMonth === month &&
          testDay === day &&
          testHour === hours &&
          testMinute === minutes
        ) {
          bestUTC = testUTC;
          // #region agent log
          fetch(
            "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "create-appointment/route.ts:378",
                message: "Found UTC for patient time",
                data: {
                  patientTime: `${hours}:${minutes}`,
                  patientDate: `${year}-${month}-${day}`,
                  foundUTC: testUTC.toISOString(),
                  offsetHours,
                  testUTCInPhoenix: providerFormatter
                    .formatToParts(testUTC)
                    .find((p) => p.type === "hour")?.value,
                },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "post-fix",
                hypothesisId: "H",
              }),
            },
          ).catch(() => {});
          // #endregion
          break;
        }
      }

      if (!bestUTC) {
        // Fallback: try multiple base times to find the right one
        const testBases = [
          new Date(Date.UTC(year, month - 1, day, 0, 0, 0)), // midnight
          new Date(Date.UTC(year, month - 1, day, 12, 0, 0)), // noon
          new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0)), // previous day noon
          new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0)), // next day noon
        ];

        for (const testBase of testBases) {
          const baseParts = patientFormatter.formatToParts(testBase);
          const baseHour = parseInt(
            baseParts.find((p) => p.type === "hour")?.value || "0",
          );
          const baseDay = parseInt(
            baseParts.find((p) => p.type === "day")?.value || "0",
          );

          if (baseDay === day) {
            let offsetHours = hours - baseHour;
            if (offsetHours < -12) offsetHours += 24;
            if (offsetHours > 12) offsetHours -= 24;

            const candidateUTC = new Date(
              testBase.getTime() +
                offsetHours * 60 * 60 * 1000 +
                minutes * 60 * 1000,
            );
            const verifyParts = patientFormatter.formatToParts(candidateUTC);
            const verifyHour = parseInt(
              verifyParts.find((p) => p.type === "hour")?.value || "0",
            );
            const verifyDay = parseInt(
              verifyParts.find((p) => p.type === "day")?.value || "0",
            );

            if (verifyDay === day && verifyHour === hours) {
              bestUTC = candidateUTC;
              // #region agent log
              fetch(
                "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "create-appointment/route.ts:400",
                    message: "Fallback UTC calculation",
                    data: {
                      patientTime: `${hours}:${minutes}`,
                      baseUTC: testBase.toISOString(),
                      baseHour,
                      offsetHours,
                      calculatedUTC: bestUTC.toISOString(),
                    },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    runId: "post-fix",
                    hypothesisId: "H",
                  }),
                },
              ).catch(() => {});
              // #endregion
              break;
            }
          }
        }

        // Final fallback
        if (!bestUTC) {
          let offsetHours = hours - basePatientHour;
          if (offsetHours < -12) offsetHours += 24;
          if (offsetHours > 12) offsetHours -= 24;
          bestUTC = new Date(
            baseUTC.getTime() +
              offsetHours * 60 * 60 * 1000 +
              minutes * 60 * 1000,
          );
        }
      }

      // Step 4: Get what this UTC time is in Phoenix timezone
      const phoenixParts = providerFormatter.formatToParts(bestUTC);
      const phoenixYear = parseInt(
        phoenixParts.find((p) => p.type === "year")?.value || "0",
      );
      const phoenixMonth = parseInt(
        phoenixParts.find((p) => p.type === "month")?.value || "0",
      );
      const phoenixDay = parseInt(
        phoenixParts.find((p) => p.type === "day")?.value || "0",
      );
      const phoenixHour = parseInt(
        phoenixParts.find((p) => p.type === "hour")?.value || "0",
      );
      const phoenixMinute = parseInt(
        phoenixParts.find((p) => p.type === "minute")?.value || "0",
      );
      const phoenixDateStr = `${phoenixYear}-${String(phoenixMonth).padStart(2, "0")}-${String(phoenixDay).padStart(2, "0")}`;
      const phoenixTimeStr = `${String(phoenixHour).padStart(2, "0")}:${String(phoenixMinute).padStart(2, "0")}`;

      // Verify: convert back to patient timezone to ensure we got it right
      const verifyPatientParts = patientFormatter.formatToParts(bestUTC);
      const verifyPatientHour = parseInt(
        verifyPatientParts.find((p) => p.type === "hour")?.value || "0",
      );
      const verifyPatientDay = parseInt(
        verifyPatientParts.find((p) => p.type === "day")?.value || "0",
      );

      // #region agent log
      fetch(
        "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "create-appointment/route.ts:415",
            message: "UTC to Phoenix conversion with verification",
            data: {
              bestUTC: bestUTC?.toISOString(),
              phoenixDate: phoenixDateStr,
              phoenixTime: phoenixTimeStr,
              phoenixHour,
              phoenixMinute,
              patientDate: `${year}-${month}-${day}`,
              patientTime: `${hours}:${minutes}`,
              verifyPatientHour,
              verifyPatientDay,
              conversionCorrect:
                verifyPatientHour === hours && verifyPatientDay === day,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "post-fix",
            hypothesisId: "I",
          }),
        },
      ).catch(() => {});
      // #endregion

      // Step 5: Find the UTC time that represents this Phoenix time
      // This ensures we store the correct UTC time that, when displayed in Phoenix, shows the right time
      const basePhoenixUTC = new Date(
        Date.UTC(phoenixYear, phoenixMonth - 1, phoenixDay, 12, 0, 0),
      );
      let bestPhoenixUTC: Date | null = null;

      for (let offsetHours = -15; offsetHours <= 15; offsetHours++) {
        const testUTC = new Date(
          basePhoenixUTC.getTime() + offsetHours * 60 * 60 * 1000,
        );
        const testPhoenixParts = providerFormatter.formatToParts(testUTC);

        const testYear = parseInt(
          testPhoenixParts.find((p) => p.type === "year")?.value || "0",
        );
        const testMonth = parseInt(
          testPhoenixParts.find((p) => p.type === "month")?.value || "0",
        );
        const testDay = parseInt(
          testPhoenixParts.find((p) => p.type === "day")?.value || "0",
        );
        const testHour = parseInt(
          testPhoenixParts.find((p) => p.type === "hour")?.value || "0",
        );
        const testMinute = parseInt(
          testPhoenixParts.find((p) => p.type === "minute")?.value || "0",
        );

        if (
          testYear === phoenixYear &&
          testMonth === phoenixMonth &&
          testDay === phoenixDay &&
          testHour === phoenixHour &&
          testMinute === phoenixMinute
        ) {
          bestPhoenixUTC = testUTC;
          break;
        }
      }

      if (!bestPhoenixUTC) {
        // Fallback: calculate approximate offset
        const basePhoenixParts =
          providerFormatter.formatToParts(basePhoenixUTC);
        const basePhoenixHour = parseInt(
          basePhoenixParts.find((p) => p.type === "hour")?.value || "0",
        );
        const basePhoenixMinute = parseInt(
          basePhoenixParts.find((p) => p.type === "minute")?.value || "0",
        );
        const offsetDiff =
          phoenixHour * 60 +
          phoenixMinute -
          (basePhoenixHour * 60 + basePhoenixMinute);
        bestPhoenixUTC = new Date(
          basePhoenixUTC.getTime() + offsetDiff * 60 * 1000,
        );
      }

      // Log timezone conversion for debugging
      console.log("🕐 [TIMEZONE_CONVERSION] Appointment booking:", {
        patientTimezone: patientTZ,
        providerTimezone: providerTimezone,
        patientSelectedDate: data.appointmentDate,
        patientSelectedTime: timeStr,
        convertedPhoenixDate: phoenixDateStr,
        convertedPhoenixTime: phoenixTimeStr,
        phoenixHour: phoenixHour,
        phoenixMinute: phoenixMinute,
        utcTime: bestPhoenixUTC.toISOString(),
      });

      // #region agent log
      fetch(
        "http://127.0.0.1:60000/ingest/9f837d7d-c74d-4d53-b3e3-0fed42051042",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "create-appointment/route.ts:430",
            message: "Timezone conversion result (POST-FIX)",
            data: {
              patientTimezone: patientTZ,
              patientSelectedTime: timeStr,
              phoenixDate: phoenixDateStr,
              phoenixTime: phoenixTimeStr,
              phoenixHour,
              phoenixMinute,
              requestedMinutes: phoenixHour * 60 + phoenixMinute,
              bestUTC: bestUTC?.toISOString(),
              bestPhoenixUTC: bestPhoenixUTC?.toISOString(),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "post-fix",
            hypothesisId: "A",
          }),
        },
      ).catch(() => {});
      // #endregion

      // Step 4: Store as UTC representing Phoenix time
      // CRITICAL: Store the UTC time that represents the Phoenix time, not the patient time
      // This ensures all appointments are stored in Phoenix timezone as required
      requestedDateTime = bestPhoenixUTC.toISOString();
    }

    // Map visit type
    const visitType =
      data.visitType?.toLowerCase() === "video"
        ? "video"
        : data.visitType?.toLowerCase() === "phone"
          ? "phone"
          : "async";

    // Generate access token for the appointment (64-character random token)
    const generateToken = () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let token = "";
      for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };

    const accessToken = generateToken();

    // Prepare appointment data with all required fields
    const appointmentInsert: Record<string, unknown> = {
      // Patient and Doctor references
      // Only set user_id if it exists and is valid (not null/undefined)
      // If patient has no user_id linked, set to null (foreign key constraint requires valid user_id or null)
      user_id: patientData.user_id || null, // Use user_id from patients table, or null if not linked
      patient_id: patientData.id, // Set patient_id from patients table
      doctor_id: DOCTOR_ID,

      // Payment information
      payment_intent_id:
        payment_intent_id || (isTestMode ? `pi_test_${Date.now()}` : null),
      payment_status: "captured", // Use "captured" for both test and production (test mode is handled via payment_intent_id prefix)

      // Appointment status - use "pending" for new appointments (will be changed to "confirmed" or "approved" by doctor)
      status: "pending",

      // Visit details
      visit_type: visitType,
      requested_date_time: requestedDateTime,
      service_type: "uti_treatment",

      // Patient information (use data from patients table)
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      patient_dob: patientDob,
      patient_location: patientLocation,
      patient_timezone: patientTimezone,

      // Medical history removed - will go to normalized tables (patient_allergies, clinical_notes)

      // Pharmacy
      preferred_pharmacy: data.pharmacy || null,
      pharmacy_address: data.pharmacyAddress || null,

      // Consent (will be set during consent flow)
      consent_accepted: false,

      // Access token
      access_token: accessToken,
    };

    // Get doctor details including timezone
    const { data: doctor, error: doctorFetchError } = await supabase
      .from("doctors")
      .select("first_name, last_name, timezone")
      .eq("id", DOCTOR_ID)
      .single();

    if (doctorFetchError || !doctor) {
      console.error("❌ Doctor not found:", doctorError);
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    let dailyMeeting = null;

     if (visitType === "video" && requestedDateTime) {
      // Create Daily.co meeting
      console.log("📹 Creating Daily.co meeting for video appointment...");
      try {
        if (!process.env.DAILY_API_KEY) {
          console.warn(
            "⚠️ Daily.co API key not configured. Skipping Daily.co meeting creation.",
          );
        } else {
          const doctorName = `Dr. ${doctor.first_name} ${doctor.last_name}`;

          const dailyMeetingParams = {
            privacy: "private" as const,
            properties: {
              enable_screenshare: true,
              enable_chat: true,
              enable_knocking: true,
              enable_prejoin_ui: true,
              start_audio_off: false,
              start_video_off: false,
              enable_recording: "cloud", // Enable cloud recording
            },
          };

          console.log("📋 Daily.co meeting parameters:", dailyMeetingParams);
          dailyMeeting = await dailyService.createRoom(dailyMeetingParams);
          console.log(
            "✅ Daily.co meeting created successfully:",
            dailyMeeting?.url,
          );

          // Create owner token for doctor (host with recording permissions)
          const ownerToken = await dailyService.createMeetingToken({
            properties: {
              room_name: dailyMeeting.name,
              is_owner: true,
              user_name: doctorName,
              start_cloud_recording: false, // Doctor can manually start recording
            },
          });

          console.log("✅ Daily.co owner token created for doctor");

          // Store the owner token for the doctor
          dailyMeeting.owner_token = ownerToken.token;
        }
      } catch (dailyError) {
        console.error("❌ Daily.co meeting creation failed:", dailyError);
        // Continue without Daily.co meeting
      }
    }

    // Insert appointment
    console.log("💾 [APPOINTMENT_STORAGE] Storing appointment:", {
      requestedDateTime: appointmentInsert.requested_date_time,
      patientTimezone: patientTimezone,
      providerTimezone: providerTimezone || "America/Phoenix",
    });
    if (dailyMeeting) {
      appointmentInsert.dailyco_meeting_url = dailyMeeting.url;
      appointmentInsert.dailyco_room_name = dailyMeeting.name; // Store room name
      appointmentInsert.dailyco_owner_token = dailyMeeting.owner_token; // Store doctor's host token
    }
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert(appointmentInsert)
      .select()
      .single();

    if (error) {
      // If error is due to status constraint violation, provide helpful message
      if (error.code === "23514" && error.message?.includes("status_check")) {
        return NextResponse.json(
          {
            error: "Database constraint error: 'approved' status not allowed",
            details:
              "The appointments_status_check constraint does not include 'approved' as a valid status.",
            solution:
              "Run the SQL migration in supabase-migrations/fix-appointments-status-constraint.sql in your Supabase SQL Editor to update the constraint.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Failed to create appointment", details: error.message },
        { status: 500 },
      );
    }

    // Save chief_complaint to clinical_notes table (normalized structure)
    const chiefComplaintText =
      `${data.symptoms} / ${data.chief_complaint}` || null;
    if (chiefComplaintText && appointment?.id && appointment?.patient_id) {
      try {
        const { error: notesError } = await supabase
          .from("clinical_notes")
          .insert([
            {
              patient_id: appointment.patient_id,
              appointment_id: appointment.id,
              note_type: "chief_complaint",
              content: chiefComplaintText,
            },
            {
              patient_id: appointment.patient_id,
              appointment_id: appointment.id,
              note_type: "subjective",
              content: chiefComplaintText,
            },
          ]);

        if (notesError) {
          console.error(
            "[CLINICAL_NOTES] ❌ Error saving chief_complaint:",
            notesError,
          );
        }
      } catch (clinicalNotesError) {
        console.error(
          "[CLINICAL_NOTES] ❌ Error saving chief_complaint to clinical_notes:",
          clinicalNotesError,
        );
      }
    }

    // Save allergies to patient_allergies table (normalized structure)
    console.log("[ALLERGIES] Processing allergies...");
    console.log("Intake form data :", data);
    if (
      data.allergies === true &&
      data.allergiesDetails &&
      appointment?.id &&
      appointment?.patient_id
    ) {
      try {
        console.log("Inside the if condition");
        // Convert to string if it's not already
        const allergiesDetailsStr =
          typeof data.allergiesDetails === "string"
            ? data.allergiesDetails
            : String(data.allergiesDetails || "");

        // Parse allergies if it's a string (comma-separated or newline-separated)
        const allergyList = allergiesDetailsStr
          .split(/[,\n]/)
          .map((a: string) => a.trim())
          .filter((a: string) => a.length > 0);

        console.log("[ALLERGIES] Parsed allergy list:", allergyList);

        if (allergyList.length > 0) {
          // Check for existing allergies to prevent duplicates
          console.log("[ALLERGIES] Checking for existing allergies...");
          const { data: existingAllergies, error: fetchError } = await supabase
            .from("patient_allergies")
            .select("allergen_name")
            .eq("patient_id", appointment.patient_id)
            .in("allergen_name", allergyList);

          if (fetchError) {
            console.error(
              "[ALLERGIES] ❌ Error fetching existing allergies:",
              fetchError,
            );
          } else {
            console.log(
              "[ALLERGIES] Found existing allergies:",
              existingAllergies?.length || 0,
            );
          }

          // Filter out duplicates (case-insensitive)
          const existingAllergenNames = (existingAllergies || []).map(
            (a: { allergen_name?: string }) => a.allergen_name?.toLowerCase(),
          );
          const newAllergies = allergyList.filter(
            (allergen: string) =>
              !existingAllergenNames.includes(allergen.toLowerCase()),
          );

          console.log(
            "[ALLERGIES] New allergies to insert:",
            newAllergies.length,
          );

          if (newAllergies.length > 0) {
            const allergiesToInsert = newAllergies.map((allergen: string) => ({
              patient_id: appointment.patient_id,
              allergen_name: allergen,
              reaction: null, // Can be filled later by doctor
              status: "active",
            }));

            console.log("[ALLERGIES] Inserting allergies:", allergiesToInsert);
            const { error: insertError } = await supabase
              .from("patient_allergies")
              .insert(allergiesToInsert);

            if (insertError) {
              console.error(
                "[ALLERGIES] ❌ Error saving allergies to patient_allergies:",
                insertError,
              );
            } else {
              console.log(
                `[ALLERGIES] ✅ Saved ${newAllergies.length} new allergies for patient ${appointment.patient_id}`,
              );
            }
          } else {
            console.log(
              "[ALLERGIES] ℹ️ All allergies already exist for this patient, skipping insert",
            );
          }
        } else {
          console.log("[ALLERGIES] No allergies to process (empty list)");
        }
      } catch (allergiesError) {
        console.error(
          "[ALLERGIES] ❌ Error saving allergies to patient_allergies:",
          allergiesError,
        );
      }
    } else {
      console.log("[ALLERGIES] Skipping allergies - Reason:", {
        allergies: data.allergies,
        allergiesDetails: data.allergiesDetails ? "provided" : "missing",
        appointmentId: appointment?.id ? "exists" : "missing",
        patientId: appointment?.patient_id ? "exists" : "missing",
      });
    }

    // Save surgeries to clinical_notes table (normalized structure)
    console.log("[SURGERIES] Processing surgeries...");
    if (
      data.surgeries === true &&
      data.surgeriesDetails &&
      appointment?.id &&
      appointment?.patient_id
    ) {
      try {
        const surgeriesContent =
          typeof data.surgeriesDetails === "string"
            ? data.surgeriesDetails
            : String(data.surgeriesDetails || "");

        console.log(
          "[SURGERIES] Surgeries content:",
          surgeriesContent.substring(0, 100) + "...",
        );
        const { error: insertError } = await supabase
          .from("clinical_notes")
          .insert({
            patient_id: appointment.patient_id,
            appointment_id: appointment.id,
            note_type: "surgeries", // Use dedicated surgeries type instead of subjective
            content: surgeriesContent,
          });

        if (insertError) {
          console.error(
            "[SURGERIES] ❌ Error saving surgeries to clinical_notes:",
            insertError,
          );
        } else {
          console.log(
            `[SURGERIES] ✅ Saved surgeries note for appointment ${appointment.id}`,
          );
        }
      } catch (surgeriesError) {
        console.error(
          "[SURGERIES] ❌ Error saving surgeries to clinical_notes:",
          surgeriesError,
        );
      }
    } else {
      console.log("[SURGERIES] Skipping surgeries - Reason:", {
        surgeries: data.surgeries,
        surgeriesDetails: data.surgeriesDetails ? "provided" : "missing",
        appointmentId: appointment?.id ? "exists" : "missing",
        patientId: appointment?.patient_id ? "exists" : "missing",
      });
    }

    // Save medical issues to problems table (normalized structure)
    console.log("[MEDICAL_ISSUES] Processing medical issues...");
    if (
      data.medicalIssues === true &&
      data.medicalIssuesDetails &&
      appointment?.id &&
      appointment?.patient_id
    ) {
      console.log("[MEDICAL_ISSUES] Medical issues data found, processing...");
      try {
        // Convert to string if it's not already
        const medicalIssuesDetailsStr =
          typeof data.medicalIssuesDetails === "string"
            ? data.medicalIssuesDetails
            : String(data.medicalIssuesDetails || "");

        // Parse medical issues if it's a string (comma-separated or newline-separated)
        const issuesList = medicalIssuesDetailsStr
          .split(/[,\n]/)
          .map((i: string) => i.trim())
          .filter((i: string) => i.length > 0);

        console.log("[MEDICAL_ISSUES] Parsed issues list:", issuesList);

        if (issuesList.length > 0) {
          // Check for existing problems to prevent duplicates
          console.log("[MEDICAL_ISSUES] Checking for existing problems...");
          const { data: existingProblems, error: fetchError } = await supabase
            .from("problems")
            .select("problem_name")
            .eq("patient_id", appointment.patient_id)
            .in("problem_name", issuesList);

          if (fetchError) {
            console.error(
              "[MEDICAL_ISSUES] ❌ Error fetching existing problems:",
              fetchError,
            );
          } else {
            console.log(
              "[MEDICAL_ISSUES] Found existing problems:",
              existingProblems?.length || 0,
            );
          }

          // Filter out duplicates (case-insensitive)
          const existingProblemNames = (existingProblems || []).map(
            (p: { problem_name?: string }) => p.problem_name?.toLowerCase(),
          );
          const newProblems = issuesList.filter(
            (issue: string) =>
              !existingProblemNames.includes(issue.toLowerCase()),
          );

          console.log(
            "[MEDICAL_ISSUES] New problems to insert:",
            newProblems.length,
          );

          if (newProblems.length > 0) {
            const problemsToInsert = newProblems.map((issue: string) => ({
              patient_id: appointment.patient_id,
              problem_name: issue,
              status: "active",
            }));

            console.log(
              "[MEDICAL_ISSUES] Inserting problems:",
              problemsToInsert,
            );
            const { error: insertError } = await supabase
              .from("problems")
              .insert(problemsToInsert);

            if (insertError) {
              console.error(
                "[MEDICAL_ISSUES] ❌ Error saving medical issues to problems:",
                insertError,
              );
            } else {
              console.log(
                `[MEDICAL_ISSUES] ✅ Saved ${newProblems.length} new problems for patient ${appointment.patient_id}`,
              );
            }
          } else {
            console.log(
              "[MEDICAL_ISSUES] ℹ️ All medical issues already exist for this patient, skipping insert",
            );
          }
        } else {
          console.log("[MEDICAL_ISSUES] No issues to process (empty list)");
        }
      } catch (medicalIssuesError) {
        console.error(
          "[MEDICAL_ISSUES] ❌ Error saving medical issues to problems:",
          medicalIssuesError,
        );
      }
    } else {
      console.log("[MEDICAL_ISSUES] Skipping medical issues - Reason:", {
        medicalIssues: data.medicalIssues,
        medicalIssuesDetails: data.medicalIssuesDetails
          ? "provided"
          : "missing",
        appointmentId: appointment?.id ? "exists" : "missing",
        patientId: appointment?.patient_id ? "exists" : "missing",
      });
    }

    // Save medications to medication_history table (normalized structure)
    console.log("[MEDICATIONS] Processing medications...");
    if (
      data.medications === true &&
      data.medicationsDetails &&
      appointment?.id &&
      appointment?.patient_id
    ) {
      console.log("[MEDICATIONS] Medications data found, processing...");
      try {
        // Convert to string if it's not already
        const medicationsDetailsStr =
          typeof data.medicationsDetails === "string"
            ? data.medicationsDetails
            : String(data.medicationsDetails || "");

        // Parse medications if it's a string (comma-separated or newline-separated)
        const medicationList = medicationsDetailsStr
          .split(/[,\n]/)
          .map((m: string) => m.trim())
          .filter((m: string) => m.length > 0);

        console.log("[MEDICATIONS] Parsed medication list:", medicationList);

        if (medicationList.length > 0) {
          // Check for existing medications to prevent duplicates
          console.log("[MEDICATIONS] Checking for existing medications...");
          const { data: existingMedications, error: fetchError } =
            await supabase
              .from("medication_history")
              .select("medication_name")
              .eq("patient_id", appointment.patient_id)
              .in("medication_name", medicationList);

          if (fetchError) {
            console.error(
              "[MEDICATIONS] ❌ Error fetching existing medications:",
              fetchError,
            );
          } else {
            console.log(
              "[MEDICATIONS] Found existing medications:",
              existingMedications?.length || 0,
            );
          }

          // Filter out duplicates (case-insensitive)
          const existingMedicationNames = (existingMedications || []).map(
            (m: { medication_name?: string }) =>
              m.medication_name?.toLowerCase(),
          );
          const newMedications = medicationList.filter(
            (medication: string) =>
              !existingMedicationNames.includes(medication.toLowerCase()),
          );

          console.log(
            "[MEDICATIONS] New medications to insert:",
            newMedications.length,
          );

          if (newMedications.length > 0) {
            const medicationsToInsert = newMedications.map(
              (medication: string) => ({
                patient_id: appointment.patient_id,
                medication_name: medication,
                start_date: new Date().toISOString().split("T")[0], // Current date as start date (YYYY-MM-DD format)
                end_date: null, // null means medication is still active
              }),
            );

            console.log(
              "[MEDICATIONS] Inserting medications:",
              medicationsToInsert,
            );
            const { error: insertError } = await supabase
              .from("medication_history")
              .insert(medicationsToInsert);

            if (insertError) {
              console.error(
                "[MEDICATIONS] ❌ Error saving medications to medication_history:",
                insertError,
              );
            } else {
              console.log(
                `[MEDICATIONS] ✅ Saved ${newMedications.length} new medications for patient ${appointment.patient_id}`,
              );
            }
          } else {
            console.log(
              "[MEDICATIONS] ℹ️ All medications already exist for this patient, skipping insert",
            );
          }
        } else {
          console.log("[MEDICATIONS] No medications to process (empty list)");
        }
      } catch (medicationsError) {
        console.error(
          "[MEDICATIONS] ❌ Error saving medications to medication_history:",
          medicationsError,
        );
      }
    } else {
      console.log("[MEDICATIONS] Skipping medications - Reason:", {
        medications: data.medications,
        medicationsDetails: data.medicationsDetails ? "provided" : "missing",
        appointmentId: appointment?.id ? "exists" : "missing",
        patientId: appointment?.patient_id ? "exists" : "missing",
      });
    }

    // Create Zoom meeting for video appointments
    // let zoomMeetingUrl = null;
    // let zoomStartUrl = null;
    // if (visitType === "video" && requestedDateTime) {
    //   try {
    //     const patientName = patientFirstName && patientLastName
    //       ? `${patientFirstName} ${patientLastName}`
    //       : undefined;

    //     const zoomMeeting = await createZoomMeeting({
    //       topic: `Medical Consultation - ${patientName || "Patient"}`,
    //       startTime: requestedDateTime,
    //       duration: 30, // 30 minutes default
    //       timezone: patientTimezone,
    //       patientEmail: patientEmail || undefined,
    //       patientName: patientName,
    //     });

    //     zoomMeetingUrl = zoomMeeting.join_url;
    //     zoomStartUrl = zoomMeeting.start_url;

    //     // Update appointment with Zoom meeting URLs (join URL and start URL)
    //     const { error: updateError } = await supabase
    //       .from("appointments")
    //       .update({
    //         zoom_meeting_url: zoomMeetingUrl,
    //         zoom_start_url: zoomStartUrl
    //       })
    //       .eq("id", appointment.id);

    //     if (!updateError) {
    //       // Update the appointment object in the response
    //       appointment.zoom_meeting_url = zoomMeetingUrl;
    //     }
    //   } catch (zoomError) {
    //     // Don't fail the request if Zoom fails, appointment is already created
    //   }
    // }

    // Create payment record
    // In test mode, paymentIntent might not have amount/currency, use defaults
    const paymentAmount = paymentIntent?.amount || (isTestMode ? 0 : null);
    const paymentCurrency =
      paymentIntent?.currency || (isTestMode ? "USD" : null);

    if (paymentAmount !== null) {
      await supabase.from("payment_records").insert({
        appointment_id: appointment.id,
        payment_intent_id: payment_intent_id,
        stripe_payment_intent_id: payment_intent_id,
        amount: paymentAmount,
        currency: paymentCurrency || "USD",
        status: "captured",
      });
    }

    // Send email and SMS notifications with appointment link
    // Get base URL from environment or request headers
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
      } else {
        const headers = request.headers;
        const host = headers.get("host");
        const protocol = headers.get("x-forwarded-proto") || "https";
        baseUrl = host ? `${protocol}://${host}` : "https://medazonhealth.com";
      }
    }

    const appointmentLink = `${baseUrl}/appointment/${accessToken}`;
    const doctorPanelLink =
      "https://hipa-doctor-panel.vercel.app/doctor/appointments";

    // Format date and time for display in patient's local timezone
    // The stored requestedDateTime is UTC, but represents Phoenix time
    // We need to display it in patient's local timezone (what they selected)
    let formattedDate = "Not scheduled";
    let formattedTime = "";
    let formattedDateForSMS = "";
    if (requestedDateTime) {
      const appointmentDate = new Date(requestedDateTime);
      // Use patient's timezone for display (what they selected)
      const patientTZ =
        patientTimezone || data.patientTimezone || "America/New_York";

      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: patientTZ,
      };
      formattedDate = appointmentDate.toLocaleDateString("en-US", options);

      // Format for SMS (e.g., "Wednesday, November 19th")
      // Get date components in the patient's timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: patientTZ,
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const parts = formatter.formatToParts(appointmentDate);
      const weekday = parts.find((p) => p.type === "weekday")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");
      const daySuffix =
        day === 1 || day === 21 || day === 31
          ? "st"
          : day === 2 || day === 22
            ? "nd"
            : day === 3 || day === 23
              ? "rd"
              : "th";
      formattedDateForSMS = `${weekday}, ${month} ${day}${daySuffix}`;

      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: patientTZ,
      };
      formattedTime = appointmentDate.toLocaleTimeString("en-US", timeOptions);
    }

    const patientName =
      patientFirstName && patientLastName
        ? `${patientFirstName} ${patientLastName}`
        : "Patient";

    const visitTypeDisplay =
      visitType === "video"
        ? "Video Visit"
        : visitType === "phone"
          ? "Phone Visit"
          : "Consultation";

    // Generate SMS message for patient (used in both SMS and email)
    let patientSMSMessage = "";
    if (data.phone || data.email) {
      // Format SMS message similar to screenshot
      if (formattedDateForSMS && formattedTime) {
        patientSMSMessage = `You have a ${visitTypeDisplay} appointment with ${doctorName} on ${formattedDateForSMS} at ${formattedTime.replace(" AM", "am").replace(" PM", "pm")} AZ Time.`;
        if (appointmentLink) {
          patientSMSMessage += `\n\nYour appointment link is: ${appointmentLink}`;
        }
      } else {
        // Fallback to template-based message
        patientSMSMessage = generateSMSMessage({
          patientName: patientFirstName || "there",
          fullName: patientName,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          visitType: visitType,
          visitTypeDisplay: visitTypeDisplay,
          appointmentLink: appointmentLink,
          zoomMeetingUrl: null, // Don't include zoom link for patients
          dailyMeetingUrl: dailyMeeting?.url || null,
        });
      }
    }

    // Send email notification to patient
    if (patientEmail) {
      try {
        const emailHTML = generateAppointmentEmailHTML({
          doctorName,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          visitType,
          appointmentLink,
          smsMessage: patientSMSMessage,
        });

        await sendEmail({
          to: patientEmail,
          subject: `Your telemedicine appointment with ${doctorName}`,
          html: emailHTML,
        });
      } catch (emailError) {
        // Don't fail the request if email fails
      }
    }

    // Send SMS notification to patient
    if (patientPhone) {
      try {
        await sendSMS({
          to: patientPhone,
          message: patientSMSMessage,
        });
      } catch (smsError) {
        // Don't fail the request if SMS fails
      }
    }

    // Send email notification to doctor
    if (doctorEmail) {
      try {
        await sendEmail({
          to: doctorEmail,
          subject: `New Appointment Scheduled - ${patientName} - ${formattedDate}`,
          html: generateDoctorAppointmentEmailHTML({
            patientName,
            appointmentDate: formattedDate,
            appointmentTime: formattedTime,
            visitType,
            doctorPanelLink,
            dailyMeetingUrl: dailyMeeting?.url || null,
            patientEmail: patientEmail || null,
            patientPhone: patientPhone || null,
          }),
        });
      } catch (doctorEmailError) {
        // Don't fail the request if email fails
      }
    }

    // Send SMS notification to doctor
    if (doctorPhone) {
      try {
        await sendSMS({
          to: doctorPhone,
          message: `New appointment scheduled: ${patientName} on ${formattedDate} at ${formattedTime}. ${visitTypeDisplay}. View: ${doctorPanelLink}${dailyMeeting?.url ? `\n\n⚠️ WARNING: START meeting link (host only, do NOT share with patients) and this will start meeting instantly: ${dailyMeeting?.url}` : ""}`,
        });
      } catch (doctorSMSError) {
        // Don't fail the request if SMS fails
      }
    }

    // ============================================================
    // BACKGROUND: Pre-generate CDSS for instant doctor access
    // Patient sees success immediately, CDSS generates in background
    //
    // How it works:
    // - On Vercel: waitUntil() keeps function alive until CDSS completes
    // - Locally/other hosts: fire-and-forget (may not complete if server stops)
    // - Either way, patient gets instant response
    // ============================================================
    const cdssPromise = generateCDSSInBackground(
      supabase,
      appointment,
      data,
      chiefComplaintText,
    ).catch((err) =>
      console.error("[CDSS_PRE_GENERATE] Background task error:", err),
    );

    if (waitUntilFn) {
      // On Vercel: waitUntil keeps the serverless function alive
      // Even if patient closes browser, server continues generating CDSS
      console.log(
        "[CDSS_PRE_GENERATE] Using waitUntil for reliable background processing",
      );
      waitUntilFn(cdssPromise);
    } else {
      // Local dev or other hosts: promise runs but may not complete
      console.log(
        "[CDSS_PRE_GENERATE] waitUntil not available, using fire-and-forget",
      );
    }

    // Return immediately - patient sees success right away!
    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      accessToken: appointment.access_token,
      appointment: appointment,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 },
    );
  }
}

// ============================================================
// BACKGROUND CDSS GENERATION
// Generates AI clinical decision support and saves to database
// Uses the EXACT same logic as doctor panel's CDSS generate API
// ============================================================

interface CDSSInput {
  chief_complaint: string;
  symptoms: string;
  duration: string;
  severity: string;
  allergies: string;
  red_flags: string[];
  patientIntake?: {
    hasDrugAllergies: boolean;
    allergies: string;
    hasOngoingMedicalIssues: boolean;
    ongoingMedicalIssuesDetails: string;
    hasRecentSurgeries: boolean;
    recentSurgeriesDetails: string;
  };
  medicationHistory?: Array<{ medication: string }>;
  patientInfo?: { dateOfBirth?: string; location?: string };
}

interface CDSSResponse {
  classification: { category: string; description: string };
  risk_level: string;
  risk_factors: string[];
  allergy_alerts?: string[];
  interaction_alerts?: string[];
  templates: {
    hpi: string;
    ros_general: string;
    assessment: string;
    plan: string;
  };
  medication_suggestions: {
    medications: Array<{
      medication: string;
      sig: string;
      quantity: string;
      refills: number;
      notes: string;
    }>;
    safety_notes: string[];
  };
  soap_note: {
    chief_complaint: string;
    hpi: string;
    ros: string;
    assessment: string;
    plan: string;
  };
  clinical_pearls?: string[];
  follow_up_recommendations?: string;
  analysis_summary?: string;
}

// Build clinical context - SAME as doctor panel
function buildClinicalContext(input: CDSSInput): string {
  const sections: string[] = [];

  sections.push(`## CHIEF COMPLAINT / REASON FOR VISIT`);
  sections.push(`Chief Complaint: ${input.chief_complaint || "Not specified"}`);
  if (input.symptoms) {
    sections.push(`Additional Symptoms: ${input.symptoms}`);
  }
  if (input.duration) {
    sections.push(`Duration: ${input.duration}`);
  }
  if (input.severity) {
    sections.push(`Severity: ${input.severity}`);
  }

  if (input.patientIntake) {
    sections.push(`\n## PATIENT INTAKE RESPONSES`);
    sections.push(
      `Drug Allergies: ${input.patientIntake.hasDrugAllergies ? `YES - ${input.patientIntake.allergies}` : "None reported (NKDA)"}`,
    );
    sections.push(
      `Ongoing Medical Issues: ${input.patientIntake.hasOngoingMedicalIssues ? `YES - ${input.patientIntake.ongoingMedicalIssuesDetails}` : "None reported"}`,
    );
    sections.push(
      `Recent Surgeries: ${input.patientIntake.hasRecentSurgeries ? `YES - ${input.patientIntake.recentSurgeriesDetails}` : "None reported"}`,
    );
  }

  if (input.red_flags && input.red_flags.length > 0) {
    sections.push(`\n## RED FLAGS IDENTIFIED`);
    input.red_flags.forEach((flag) => sections.push(`⚠️ ${flag}`));
  }

  if (input.medicationHistory && input.medicationHistory.length > 0) {
    sections.push(`\n## CURRENT MEDICATIONS`);
    input.medicationHistory.forEach((med) =>
      sections.push(`- ${med.medication}`),
    );
  }

  if (input.patientInfo?.dateOfBirth) {
    const age = calculatePatientAge(input.patientInfo.dateOfBirth);
    sections.push(`\n## PATIENT DEMOGRAPHICS`);
    sections.push(`Age: ${age} years old`);
    if (input.patientInfo.location) {
      sections.push(`Location: ${input.patientInfo.location}`);
    }
  }

  return sections.join("\n");
}

function calculatePatientAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

function extractRedFlags(text: string): string[] {
  if (!text) return [];
  const redFlagKeywords = [
    "chest pain",
    "shortness of breath",
    "difficulty breathing",
    "severe headache",
    "loss of consciousness",
    "severe abdominal pain",
    "high fever",
    "severe bleeding",
    "severe allergic reaction",
  ];
  const lowerText = text.toLowerCase();
  return redFlagKeywords.filter((flag) => lowerText.includes(flag));
}

// Validate and enrich response - SAME as doctor panel
function validateAndEnrichResponse(
  response: any,
  input: CDSSInput,
): CDSSResponse {
  if (input.patientIntake?.hasDrugAllergies && input.patientIntake.allergies) {
    const allergyAlert = `⚠️ PATIENT HAS DRUG ALLERGIES: ${input.patientIntake.allergies}`;
    response.allergy_alerts = response.allergy_alerts || [];
    if (!response.allergy_alerts.includes(allergyAlert)) {
      response.allergy_alerts.unshift(allergyAlert);
    }
  }

  return {
    classification: response.classification || {
      category: "General",
      description: "Requires clinical review",
    },
    risk_level: response.risk_level || "moderate_risk",
    risk_factors: response.risk_factors || [],
    allergy_alerts: response.allergy_alerts || [],
    interaction_alerts: response.interaction_alerts || [],
    templates: response.templates || {
      hpi: "",
      ros_general: "",
      assessment: "",
      plan: "",
    },
    medication_suggestions: response.medication_suggestions || {
      medications: [],
      safety_notes: [],
    },
    soap_note: response.soap_note || {
      chief_complaint: "",
      hpi: "",
      ros: "",
      assessment: "",
      plan: "",
    },
    clinical_pearls: response.clinical_pearls || [],
    follow_up_recommendations: response.follow_up_recommendations || "",
    analysis_summary: response.analysis_summary || "",
  };
}

// Generate CDSS response - SAME as doctor panel
async function generateCDSSResponse(
  input: CDSSInput,
  apiKey: string,
): Promise<CDSSResponse> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const promptId = process.env.OPENAI_PROMPT_ID;

  const clinicalContext = buildClinicalContext(input);

  const userPayload = {
    chief_complaint: input.chief_complaint || "Not provided",
    symptoms: input.symptoms || "Not provided",
    duration: input.duration || "Not provided",
    severity: input.severity || "Not provided",
    allergies: input.allergies || "NKDA",
    red_flags:
      input.red_flags.length > 0 ? input.red_flags : ["None identified"],
    clinical_context: clinicalContext,
    patient_intake: input.patientIntake,
    medication_history: input.medicationHistory,
  };

  try {
    // Try Prompt API if configured (same as doctor panel)
    if (promptId) {
      try {
        console.log("[CDSS] 📡 Trying OpenAI Prompt API...");
        const inputMessages = [
          {
            role: "user",
            content: [
              { type: "input_text", text: JSON.stringify(userPayload) },
            ],
          },
        ];

        const response = (await Promise.race([
          client.responses.create({
            prompt: { id: promptId },
            input: inputMessages,
          } as any),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Prompt API timeout")), 90000),
          ),
        ])) as any;

        const outputText =
          response.output_text ||
          response.output?.[0]?.content?.[0]?.text ||
          "";
        if (outputText) {
          console.log("[CDSS] ✅ Prompt API succeeded");
          return validateAndEnrichResponse(JSON.parse(outputText), input);
        }
      } catch (promptError: any) {
        console.log(
          "[CDSS] ⚠️ Prompt API failed, using Chat Completions:",
          promptError.message,
        );
      }
    }

    // Fallback to Chat Completions - SAME prompt as doctor panel
    console.log("[CDSS] 📡 Using Chat Completions API");
    const completion = await client.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a Clinical Decision Support System (CDSS) for a telemedicine platform specializing in UTI and STD treatment.

ANALYZE the comprehensive patient data provided and generate:
1. Risk classification and assessment
2. Medication recommendations based on IDSA/CDC/AAFP guidelines
3. Drug interaction and allergy alerts
4. SOAP note templates
5. Clinical pearls and safety notes

CRITICAL REQUIREMENTS:
- ALWAYS check allergies before recommending medications
- Review medication history to avoid duplicates/interactions
- Consider active problems and current medications
- Flag any contraindications or concerns
- Follow evidence-based guidelines

Respond in JSON format:
{
  "analysis_summary": "Brief clinical analysis summary",
  "classification": { "category": "...", "description": "..." },
  "risk_level": "low_risk|moderate_risk|high_risk|urgent_escalation",
  "risk_factors": ["..."],
  "allergy_alerts": ["warnings based on reported allergies"],
  "interaction_alerts": ["drug interaction warnings"],
  "templates": { "hpi": "...", "ros_general": "...", "assessment": "...", "plan": "..." },
  "medication_suggestions": {
    "medications": [{ "medication": "...", "sig": "...", "quantity": "...", "refills": 0, "notes": "...", "rationale": "...", "guidelines": "..." }],
    "safety_notes": ["..."],
    "alternatives": ["..."]
  },
  "soap_note": { "chief_complaint": "...", "hpi": "...", "ros": "...", "assessment": "...", "plan": "..." },
  "clinical_pearls": ["..."],
  "follow_up_recommendations": "..."
}`,
        },
        {
          role: "user",
          content: `Please analyze this patient case:\n\n${clinicalContext}\n\nStructured Data: ${JSON.stringify(userPayload)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content || "{}";
    console.log("[CDSS] ✅ Chat Completions API succeeded");
    return validateAndEnrichResponse(JSON.parse(responseText), input);
  } catch (error: any) {
    console.error("[CDSS] ❌ Generation Error:", error);
    // Return fallback response
    return {
      classification: {
        category: "General Consultation",
        description: "Requires clinical review",
      },
      risk_level: "moderate_risk",
      risk_factors: [],
      allergy_alerts: input.patientIntake?.hasDrugAllergies
        ? [
            `⚠️ Patient reports drug allergies: ${input.patientIntake.allergies}`,
          ]
        : [],
      interaction_alerts: [],
      templates: { hpi: "", ros_general: "", assessment: "", plan: "" },
      medication_suggestions: {
        medications: [],
        safety_notes: ["AI generation failed - manual review required"],
      },
      soap_note: {
        chief_complaint: input.chief_complaint || "",
        hpi: "",
        ros: "",
        assessment: "",
        plan: "",
      },
      clinical_pearls: [],
      follow_up_recommendations: "",
      analysis_summary:
        "CDSS generation failed - manual clinical assessment required",
    };
  }
}

// Main background function - runs after appointment creation
async function generateCDSSInBackground(
  supabase: ReturnType<typeof createServerClient>,
  appointment: any,
  intakeData: any,
  chiefComplaint: string | null,
) {
  try {
    console.log(
      "[CDSS_PRE_GENERATE] 🔄 Starting CDSS generation for appointment:",
      appointment.id,
    );

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.log(
        "[CDSS_PRE_GENERATE] ⚠️ OpenAI API key not configured, skipping",
      );
      return;
    }

    // Build input - SAME structure as doctor panel
    const cdssInput: CDSSInput = {
      chief_complaint: chiefComplaint || intakeData.symptoms || "",
      symptoms: intakeData.symptoms || "",
      duration: "",
      severity: "",
      allergies:
        intakeData.allergies === true && intakeData.allergiesDetails
          ? intakeData.allergiesDetails
          : "NKDA",
      red_flags: extractRedFlags(chiefComplaint || intakeData.symptoms || ""),
      patientIntake: {
        hasDrugAllergies: intakeData.allergies === true,
        allergies: intakeData.allergiesDetails || "",
        hasOngoingMedicalIssues: intakeData.medicalIssues === true,
        ongoingMedicalIssuesDetails: intakeData.medicalIssuesDetails || "",
        hasRecentSurgeries: intakeData.surgeries === true,
        recentSurgeriesDetails: intakeData.surgeriesDetails || "",
      },
      medicationHistory:
        intakeData.medications === true && intakeData.medicationsDetails
          ? intakeData.medicationsDetails
              .split(/[,\n]/)
              .map((m: string) => ({ medication: m.trim() }))
              .filter((m: { medication: string }) => m.medication)
          : [],
      patientInfo: {
        dateOfBirth: intakeData.dateOfBirth || undefined,
        location: intakeData.streetAddress || undefined,
      },
    };

    console.log("[CDSS_PRE_GENERATE] 🤖 Calling OpenAI...");
    const cdssResponse = await generateCDSSResponse(cdssInput, openaiApiKey);
    console.log("[CDSS_PRE_GENERATE] ✅ CDSS response received", {
      hasClassification: !!cdssResponse.classification,
      hasRiskLevel: !!cdssResponse.risk_level,
    });

    // Save to database - SAME as doctor panel
    console.log("[CDSS_PRE_GENERATE] 💾 Saving response to database");
    const { error: saveError } = await supabase.from("cdss_responses").insert({
      appointment_id: appointment.id,
      response_data: cdssResponse,
      created_by: null, // System generated (no user in patient panel context)
    });

    if (saveError) {
      console.error("[CDSS_PRE_GENERATE] ❌ Failed to save CDSS:", saveError);
    } else {
      console.log("[CDSS_PRE_GENERATE] ✅ CDSS saved to database");

      // Set auto-generated flag - SAME as doctor panel
      const { error: flagError } = await supabase
        .from("appointments")
        .update({ cdss_auto_generated: true })
        .eq("id", appointment.id);

      if (flagError) {
        console.error(
          "[CDSS_PRE_GENERATE] ⚠️ Failed to set auto-generated flag:",
          flagError,
        );
      } else {
        console.log("[CDSS_PRE_GENERATE] ✅ Auto-generated flag set");
      }
    }
  } catch (error: any) {
    console.error("[CDSS_PRE_GENERATE] ❌ Error:", error.message);
  }
}

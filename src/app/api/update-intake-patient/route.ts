import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      has_drug_allergies,
      has_recent_surgeries,
      has_ongoing_medical_issues,
      preferred_pharmacy,
    } = body;

    console.log("📋 [UPDATE-INTAKE-PATIENT] Request:", {
      email,
      has_drug_allergies,
      has_recent_surgeries,
      has_ongoing_medical_issues,
      preferred_pharmacy,
    });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      console.log("⚠️ [UPDATE-INTAKE-PATIENT] User not found for email:", email);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find patient record by user_id
    const patient = await prisma.patient.findFirst({
      where: { user_id: user.id },
    });

    if (!patient) {
      console.log("⚠️ [UPDATE-INTAKE-PATIENT] Patient not found for user:", user.id);
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Update patient record
    const updatedPatient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        has_drug_allergies: has_drug_allergies ?? patient.has_drug_allergies,
        has_recent_surgeries: has_recent_surgeries ?? patient.has_recent_surgeries,
        has_ongoing_medical_issues: has_ongoing_medical_issues ?? patient.has_ongoing_medical_issues,
        preferred_pharmacy: preferred_pharmacy || patient.preferred_pharmacy,
        updated_at: new Date(),
      },
    });

    console.log("✅ [UPDATE-INTAKE-PATIENT] Updated patient:", updatedPatient.id);

    return NextResponse.json({
      success: true,
      patientId: updatedPatient.id,
    });

  } catch (error) {
    console.error("❌ [UPDATE-INTAKE-PATIENT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, phone, dateOfBirth, address } = await request.json();

    if (!email || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Email, first name, last name, and phone are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if patient exists by email
    const { data: existingPatient, error: searchError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, mobile_phone")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if patient doesn't exist
      console.error("Error searching for patient:", searchError);
      return NextResponse.json(
        { error: "Failed to check patient", details: searchError.message },
        { status: 500 }
      );
    }

    // If patient exists, return their ID
    if (existingPatient) {
      // Update patient info if provided (optional updates)
      const updateData: any = {};
      if (firstName && existingPatient.first_name !== firstName) {
        updateData.first_name = firstName;
      }
      if (lastName && existingPatient.last_name !== lastName) {
        updateData.last_name = lastName;
      }
      if (phone && existingPatient.mobile_phone !== phone) {
        updateData.mobile_phone = phone;
      }
      if (dateOfBirth) {
        updateData.date_of_birth = dateOfBirth;
      }
      if (address) {
        updateData.address = address;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        await supabase
          .from("users")
          .update(updateData)
          .eq("id", existingPatient.id);
      }

      return NextResponse.json({
        success: true,
        patientId: existingPatient.id,
        isNew: false,
        patient: existingPatient,
      });
    }

    // Create new patient
    const { data: newPatient, error: createError } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        mobile_phone: phone,
        date_of_birth: dateOfBirth || null,
        address: address || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating patient:", createError);
      return NextResponse.json(
        { error: "Failed to create patient", details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patientId: newPatient.id,
      isNew: true,
      patient: newPatient,
    });
  } catch (error: any) {
    console.error("Error in check-create-patient:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


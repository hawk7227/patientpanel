import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, phone, dateOfBirth, address, pharmacy, pharmacyAddress } = await request.json();

    if (!email || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Email, first name, last name, and phone are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Step 1: Check if user exists by email
    const { data: existingUser, error: userSearchError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, mobile_phone, date_of_birth, address")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userSearchError && userSearchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if user doesn't exist
      console.error("Error searching for user:", userSearchError);
      return NextResponse.json(
        { error: "Failed to check user", details: userSearchError.message },
        { status: 500 }
      );
    }

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // User exists - update user info if provided
      userId = existingUser.id;
      const userUpdateData: any = {};
      if (firstName && existingUser.first_name !== firstName) {
        userUpdateData.first_name = firstName;
      }
      if (lastName && existingUser.last_name !== lastName) {
        userUpdateData.last_name = lastName;
      }
      if (phone && existingUser.mobile_phone !== phone) {
        userUpdateData.mobile_phone = phone;
      }
      if (dateOfBirth && existingUser.date_of_birth !== dateOfBirth) {
        userUpdateData.date_of_birth = dateOfBirth;
      }
      if (address && existingUser.address !== address) {
        userUpdateData.address = address;
      }

      if (Object.keys(userUpdateData).length > 0) {
        userUpdateData.updated_at = new Date().toISOString();
        await supabase
          .from("users")
          .update(userUpdateData)
          .eq("id", userId);
      }
    } else {
      // User doesn't exist - create new user
      const { data: newUser, error: createUserError } = await supabase
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

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        return NextResponse.json(
          { error: "Failed to create user", details: createUserError.message },
          { status: 500 }
        );
      }

      userId = newUser.id;
      isNewUser = true;
    }

    // Step 2: Check if patient exists in patients table by user_id
    const { data: existingPatient, error: patientSearchError } = await supabase
      .from("patients")
      .select("id, user_id, first_name, last_name, email, phone, date_of_birth, location, timezone")
      .eq("user_id", userId)
      .single();

    if (patientSearchError && patientSearchError.code !== 'PGRST116') {
      console.error("Error searching for patient:", patientSearchError);
      return NextResponse.json(
        { error: "Failed to check patient", details: patientSearchError.message },
        { status: 500 }
      );
    }

    let patientId: string;
    let isNewPatient = false;

    if (existingPatient) {
      // Patient exists - update patient info if provided
      patientId = existingPatient.id;
      const patientUpdateData: any = {};
      if (firstName && existingPatient.first_name !== firstName) {
        patientUpdateData.first_name = firstName;
      }
      if (lastName && existingPatient.last_name !== lastName) {
        patientUpdateData.last_name = lastName;
      }
      if (email && existingPatient.email !== email.toLowerCase().trim()) {
        patientUpdateData.email = email.toLowerCase().trim();
      }
      if (phone && existingPatient.phone !== phone) {
        patientUpdateData.phone = phone;
      }
      if (dateOfBirth && existingPatient.date_of_birth !== dateOfBirth) {
        patientUpdateData.date_of_birth = dateOfBirth;
      }
      if (address && existingPatient.location !== address) {
        patientUpdateData.location = address;
      }
      if (pharmacy && existingPatient.preferred_pharmacy !== pharmacy) {
        patientUpdateData.preferred_pharmacy = pharmacy;
      }

      if (Object.keys(patientUpdateData).length > 0) {
        patientUpdateData.updated_at = new Date().toISOString();
        await supabase
          .from("patients")
          .update(patientUpdateData)
          .eq("id", patientId);
      }

      // Return updated patient data
      const { data: updatedPatient } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      return NextResponse.json({
        success: true,
        patientId: patientId,
        userId: userId,
        isNew: false,
        isNewUser: isNewUser,
        isNewPatient: false,
        patient: updatedPatient || existingPatient,
      });
    } else {
      // Patient doesn't exist - create new patient record
      const { data: newPatient, error: createPatientError } = await supabase
        .from("patients")
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone: phone,
          date_of_birth: dateOfBirth || null,
          location: address || null,
          preferred_pharmacy: pharmacy || null,
          timezone: 'America/New_York', // Default timezone
        })
        .select()
        .single();

      if (createPatientError) {
        console.error("Error creating patient:", createPatientError);
        return NextResponse.json(
          { error: "Failed to create patient", details: createPatientError.message },
          { status: 500 }
        );
      }

      patientId = newPatient.id;
      isNewPatient = true;

      return NextResponse.json({
        success: true,
        patientId: patientId,
        userId: userId,
        isNew: true,
        isNewUser: isNewUser,
        isNewPatient: true,
        patient: newPatient,
      });
    }
  } catch (error: any) {
    console.error("Error in check-create-patient:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


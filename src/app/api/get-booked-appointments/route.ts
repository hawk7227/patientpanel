import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const DOCTOR_ID = "1fd1af57-5529-4d00-a301-e653b4829efc";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const doctorId = searchParams.get("doctorId") || DOCTOR_ID;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate parameters are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get booked appointments for the date range
    const startOfRange = new Date(startDate);
    startOfRange.setHours(0, 0, 0, 0);
    const endOfRange = new Date(endDate);
    endOfRange.setHours(23, 59, 59, 999);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("requested_date_time")
      .eq("doctor_id", doctorId)
      .gte("requested_date_time", startOfRange.toISOString())
      .lte("requested_date_time", endOfRange.toISOString())
      .in("status", ["pending", "accepted", "confirmed"]);

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      return NextResponse.json(
        { error: "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    // Extract booked dates and times
    const bookedSlots: Record<string, string[]> = {};
    
    if (appointments) {
      appointments.forEach((apt) => {
        const aptDate = new Date(apt.requested_date_time);
        const dateStr = aptDate.toISOString().split("T")[0];
        const timeStr = `${String(aptDate.getHours()).padStart(2, "0")}:${String(aptDate.getMinutes()).padStart(2, "0")}`;
        
        if (!bookedSlots[dateStr]) {
          bookedSlots[dateStr] = [];
        }
        bookedSlots[dateStr].push(timeStr);
      });
    }

    return NextResponse.json({
      success: true,
      bookedSlots,
    });
  } catch (error: unknown) {
    console.error("Error in get-booked-appointments:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const DOCTOR_ID = "1fd1af57-5529-4d00-a301-e653b4829efc";
const APPOINTMENT_DURATION_MINUTES = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const doctorId = searchParams.get("doctorId") || DOCTOR_ID;

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get doctor info
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, first_name, last_name, specialty, timezone")
      .eq("id", doctorId)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Get availability events for the specific date
    const { data: availabilityEvents, error: eventsError } = await supabase
      .from("doctor_availability_events")
      .select("id, date, start_time, end_time, type")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .eq("type", "available")
      .order("start_time", { ascending: true });

    if (eventsError) {
      console.error("Error fetching availability events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch availability" },
        { status: 500 }
      );
    }

    // Get existing appointments for this date to exclude booked times
    // We need to query for the full day in UTC, accounting for timezone differences
    const doctorTimezone = doctor.timezone || "America/New_York";
    
    // Create start and end of day in the doctor's timezone, then convert to UTC for querying
    const [year, month, day] = date.split("-").map(Number);
    const startOfDayLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDayLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    // Convert local time to UTC for database query
    // Get the UTC offset for the doctor's timezone on this date
    const startOfDayUTC = new Date(startOfDayLocal.toLocaleString("en-US", { timeZone: "UTC" }));
    const endOfDayUTC = new Date(endOfDayLocal.toLocaleString("en-US", { timeZone: "UTC" }));
    
    // Actually, let's use a simpler approach - query all appointments and filter by date in code
    // This is more reliable for timezone handling
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("requested_date_time")
      .eq("doctor_id", doctorId)
      .in("status", ["pending", "accepted", "confirmed"]);

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
    }

    // Extract booked time slots
    // Note: requested_date_time is stored in UTC, but we need to convert it to the doctor's timezone
    const bookedTimes = new Set<string>();
    
    if (existingAppointments) {
      existingAppointments.forEach((apt) => {
        const utcDate = new Date(apt.requested_date_time);
        
        // Convert UTC time to doctor's timezone using Intl.DateTimeFormat
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: doctorTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        
        const parts = formatter.formatToParts(utcDate);
        const year = parts.find(p => p.type === "year")?.value;
        const month = parts.find(p => p.type === "month")?.value;
        const day = parts.find(p => p.type === "day")?.value;
        const hour = parts.find(p => p.type === "hour")?.value;
        const minute = parts.find(p => p.type === "minute")?.value;
        
        if (year && month && day && hour && minute) {
          const localDateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          
          // Only consider appointments on the requested date (in doctor's timezone)
          if (localDateStr === date) {
            const timeStr = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
            bookedTimes.add(timeStr);
          }
        }
      });
    }

    // Calculate minimum allowed time (3 hours from now if today, otherwise no restriction)
    const now = new Date();
    const selectedDateObj = new Date(date);
    const isToday = selectedDateObj.toDateString() === now.toDateString();
    const minAllowedTime = isToday ? new Date(now.getTime() + 3 * 60 * 60 * 1000) : null; // 3 hours from now

    // Generate available time slots from availability events
    const availableSlots: string[] = [];

    if (availabilityEvents && availabilityEvents.length > 0) {
      availabilityEvents.forEach((event) => {
        const startTime = new Date(`${event.date}T${event.start_time}`);
        const endTime = new Date(`${event.date}T${event.end_time}`);

        // Generate 30-minute slots
        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`;
          
          // Check if this slot is not booked
          if (!bookedTimes.has(timeStr)) {
            // Check if adding 30 minutes would exceed the end time
            const slotEnd = new Date(currentTime);
            slotEnd.setMinutes(slotEnd.getMinutes() + APPOINTMENT_DURATION_MINUTES);
            
            if (slotEnd <= endTime) {
              // For today, check if slot is at least 3 hours from now
              if (minAllowedTime) {
                // Create a date object for this slot time on the selected date
                const [year, month, day] = date.split("-").map(Number);
                const [hours, minutes] = timeStr.split(":").map(Number);
                const slotDateTime = new Date(year, month - 1, day, hours, minutes);
                if (slotDateTime >= minAllowedTime) {
                  availableSlots.push(timeStr);
                }
              } else {
                availableSlots.push(timeStr);
              }
            }
          }

          // Move to next 30-minute slot
          currentTime.setMinutes(currentTime.getMinutes() + APPOINTMENT_DURATION_MINUTES);
        }
      });
    } else {
      // If no specific availability events, check recurring availability
      const dayOfWeek = new Date(date).getDay();
      const { data: recurringAvailability } = await supabase
        .from("doctor_availability")
        .select("start_time, end_time")
        .eq("doctor_id", doctorId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_available", true)
        .order("start_time", { ascending: true });

      if (recurringAvailability && recurringAvailability.length > 0) {
        recurringAvailability.forEach((availability) => {
          const startTime = new Date(`${date}T${availability.start_time}`);
          const endTime = new Date(`${date}T${availability.end_time}`);

          let currentTime = new Date(startTime);
          while (currentTime < endTime) {
            const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`;
            
            if (!bookedTimes.has(timeStr)) {
              const slotEnd = new Date(currentTime);
              slotEnd.setMinutes(slotEnd.getMinutes() + APPOINTMENT_DURATION_MINUTES);
              
              if (slotEnd <= endTime) {
                // For today, check if slot is at least 3 hours from now
                if (minAllowedTime) {
                  // Create a date object for this slot time on the selected date
                  const slotDateTime = new Date(`${date}T${timeStr}`);
                  if (slotDateTime >= minAllowedTime) {
                    availableSlots.push(timeStr);
                  }
                } else {
                  availableSlots.push(timeStr);
                }
              }
            }

            currentTime.setMinutes(currentTime.getMinutes() + APPOINTMENT_DURATION_MINUTES);
          }
        });
      }
    }

    // Sort and format time slots
    availableSlots.sort();
    
    // Also return booked slots for display
    const bookedSlotsArray = Array.from(bookedTimes).sort();

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor.id,
        name: `${doctor.first_name} ${doctor.last_name}`,
        specialty: doctor.specialty,
        timezone: doctor.timezone || "America/New_York",
      },
      date,
      availableSlots,
      bookedSlots: bookedSlotsArray,
    });
  } catch (error: unknown) {
    console.error("Error in get-doctor-availability:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}


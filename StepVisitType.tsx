import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const DOCTOR_ID = "1fd1af57-5529-4d00-a301-e653b4829efc";
const APPOINTMENT_DURATION_MINUTES = 30;

// Helper function to get current date/time in a specific timezone
const getNowInTimezone = (timezone: string): Date => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  // Create a UTC date that represents this time in the timezone
  const approximateUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  let bestUTC: Date | null = null;
  
  for (let offsetHours = -12; offsetHours <= 12; offsetHours++) {
    const testUTC = new Date(approximateUTC.getTime() + offsetHours * 60 * 60 * 1000);
    const testParts = formatter.formatToParts(testUTC);
    const testYear = parseInt(testParts.find(p => p.type === 'year')?.value || '0');
    const testMonth = parseInt(testParts.find(p => p.type === 'month')?.value || '0');
    const testDay = parseInt(testParts.find(p => p.type === 'day')?.value || '0');
    const testHour = parseInt(testParts.find(p => p.type === 'hour')?.value || '0');
    const testMinute = parseInt(testParts.find(p => p.type === 'minute')?.value || '0');
    
    if (testYear === year && testMonth === month && testDay === day && 
        testHour === hour && testMinute === minute) {
      bestUTC = testUTC;
      break;
    }
  }
  
  return bestUTC || now;
};

// Helper function to create a date in a specific timezone from date string and time string
const createDateInTimezone = (dateStr: string, timeStr: string, timezone: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  // Create a UTC date that represents this time in the timezone
  const approximateUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  let bestUTC: Date | null = null;
  for (let offsetHours = -12; offsetHours <= 12; offsetHours++) {
    const testUTC = new Date(approximateUTC.getTime() + offsetHours * 60 * 60 * 1000);
    const testParts = formatter.formatToParts(testUTC);
    const testYear = parseInt(testParts.find(p => p.type === 'year')?.value || '0');
    const testMonth = parseInt(testParts.find(p => p.type === 'month')?.value || '0');
    const testDay = parseInt(testParts.find(p => p.type === 'day')?.value || '0');
    const testHour = parseInt(testParts.find(p => p.type === 'hour')?.value || '0');
    const testMinute = parseInt(testParts.find(p => p.type === 'minute')?.value || '0');
    
    if (testYear === year && testMonth === month && testDay === day && 
        testHour === hours && testMinute === minutes) {
      bestUTC = testUTC;
      break;
    }
  }
  
  return bestUTC || approximateUTC;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const doctorId = searchParams.get("doctorId") || DOCTOR_ID;

    // Support both single date and date range
    if (!date && (!startDate || !endDate)) {
      return NextResponse.json(
        { error: "Either 'date' parameter or both 'startDate' and 'endDate' parameters are required (YYYY-MM-DD)" },
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

    // CRITICAL: Provider timezone is ALWAYS America/Phoenix per requirements
    // This must match the calendar and appointment storage logic
    const doctorTimezone = "America/Phoenix";

    // Handle batch request (date range)
    if (startDate && endDate) {
      return await handleBatchRequest(startDate, endDate, doctorId, doctor, doctorTimezone);
    }

    // Handle single date request (existing logic)
    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required for single date requests" },
        { status: 400 }
      );
    }

    // Get availability events for the specific date (both available and blocked)
    const { data: allEvents, error: eventsError } = await supabase
      .from("doctor_availability_events")
      .select("id, date, start_time, end_time, type")
      .eq("doctor_id", doctorId)
      .eq("date", date)
      .order("start_time", { ascending: true });

    if (eventsError) {
      console.error("Error fetching availability events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch availability" },
        { status: 500 }
      );
    }

    // Separate available and blocked events
    const availabilityEvents = allEvents?.filter(e => e.type === "available") || [];
    const blockedEvents = allEvents?.filter(e => 
      e.type === "blocked" || e.type === "personal" || e.type === "holiday" || e.type === "google"
    ) || [];

    // Get existing appointments for this date to exclude booked times
    // We need to query for the full day in UTC, accounting for timezone differences
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
    // Note: requested_date_time is stored in UTC, but we need to convert it to Phoenix timezone
    const bookedTimes = new Set<string>();
    
    // Helper function to round time to nearest 30-minute slot
    const roundToNearestSlot = (hour: number, minute: number): { hour: number; minute: number } => {
      if (minute < 15) {
        return { hour, minute: 0 };
      } else if (minute < 45) {
        return { hour, minute: 30 };
      } else {
        // Handle hour overflow
        const newHour = hour + 1;
        return { hour: newHour >= 24 ? 0 : newHour, minute: 0 };
      }
    };
    
    if (existingAppointments) {
      existingAppointments.forEach((apt) => {
        const utcDate = new Date(apt.requested_date_time);
        
        // Convert UTC time to Phoenix timezone using Intl.DateTimeFormat
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
          
          // Only consider appointments on the requested date (in Phoenix timezone)
          if (localDateStr === date) {
            // Round to nearest 30-minute slot to match calendar display
            const rounded = roundToNearestSlot(parseInt(hour), parseInt(minute));
            const timeStr = `${String(rounded.hour).padStart(2, "0")}:${String(rounded.minute).padStart(2, "0")}`;
            bookedTimes.add(timeStr);
          }
        }
      });
    }

    // Extract blocked time slots from blocked events (times are in doctor's timezone)
    const blockedTimes = new Set<string>();
    blockedEvents.forEach((event) => {
      const [startHour, startMin] = event.start_time.split(":").map(Number);
      const [endHour, endMin] = event.end_time.split(":").map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
        blockedTimes.add(timeStr);
        
        currentMin += APPOINTMENT_DURATION_MINUTES;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    });

    // Get current date/time in doctor's timezone (Phoenix)
    const nowInDoctorTZ = getNowInTimezone(doctorTimezone);
    const todayInDoctorTZ = nowInDoctorTZ.toISOString().split('T')[0];
    const isToday = date === todayInDoctorTZ;
    
    // Calculate minimum allowed time (3 hours from now in doctor's timezone if today)
    const minAllowedTime = isToday ? new Date(nowInDoctorTZ.getTime() + 3 * 60 * 60 * 1000) : null;

    // Generate available time slots from availability events
    const availableSlots: string[] = [];

    if (availabilityEvents && availabilityEvents.length > 0) {
      availabilityEvents.forEach((event) => {
        // Times in event are in doctor's timezone (Phoenix)
        // Parse them as time strings and create dates in doctor's timezone
        const [startHour, startMin] = event.start_time.split(":").map(Number);
        const [endHour, endMin] = event.end_time.split(":").map(Number);
        
        // Generate 30-minute slots in doctor's timezone
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
          
          // Check if this slot is not booked AND not blocked
          if (!bookedTimes.has(timeStr) && !blockedTimes.has(timeStr)) {
            // Check if adding 30 minutes would exceed the end time
            let slotEndHour = currentHour;
            let slotEndMin = currentMin + APPOINTMENT_DURATION_MINUTES;
            if (slotEndMin >= 60) {
              slotEndHour += Math.floor(slotEndMin / 60);
              slotEndMin = slotEndMin % 60;
            }
            
            if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMin <= endMin)) {
              // For today, check if slot is at least 3 hours from now in doctor's timezone
              if (minAllowedTime) {
                const slotDateTime = createDateInTimezone(date, timeStr, doctorTimezone);
                if (slotDateTime >= minAllowedTime) {
                  availableSlots.push(timeStr);
                }
              } else {
                availableSlots.push(timeStr);
              }
            }
          }

          // Move to next 30-minute slot
          currentMin += APPOINTMENT_DURATION_MINUTES;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
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
          // Times in availability are in doctor's timezone (Phoenix)
          const [startHour, startMin] = availability.start_time.split(":").map(Number);
          const [endHour, endMin] = availability.end_time.split(":").map(Number);
          
          // Generate 30-minute slots in doctor's timezone
          let currentHour = startHour;
          let currentMin = startMin;
          
          while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
            const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
            
            // Check if this slot is not booked AND not blocked
            if (!bookedTimes.has(timeStr) && !blockedTimes.has(timeStr)) {
              // Check if adding 30 minutes would exceed the end time
              let slotEndHour = currentHour;
              let slotEndMin = currentMin + APPOINTMENT_DURATION_MINUTES;
              if (slotEndMin >= 60) {
                slotEndHour += Math.floor(slotEndMin / 60);
                slotEndMin = slotEndMin % 60;
              }
              
              if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMin <= endMin)) {
                // For today, check if slot is at least 3 hours from now in doctor's timezone
                if (minAllowedTime) {
                  const slotDateTime = createDateInTimezone(date, timeStr, doctorTimezone);
                  if (slotDateTime >= minAllowedTime) {
                    availableSlots.push(timeStr);
                  }
                } else {
                  availableSlots.push(timeStr);
                }
              }
            }

            // Move to next 30-minute slot
            currentMin += APPOINTMENT_DURATION_MINUTES;
            if (currentMin >= 60) {
              currentHour += Math.floor(currentMin / 60);
              currentMin = currentMin % 60;
            }
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
        timezone: "America/Phoenix", // Always Phoenix per requirements
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

// Batch request handler for date ranges
async function handleBatchRequest(
  startDate: string,
  endDate: string,
  doctorId: string,
  doctor: any,
  doctorTimezone: string
) {
  const supabase = createServerClient();
  
  // Generate all dates in the range
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dates.push(dateStr);
  }

  // Get all availability events for the date range (both available and blocked)
  const { data: allEvents, error: eventsError } = await supabase
    .from("doctor_availability_events")
    .select("id, date, start_time, end_time, type")
    .eq("doctor_id", doctorId)
    .in("date", dates)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (eventsError) {
    console.error("Error fetching availability events:", eventsError);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }

  // Separate available and blocked events
  const availabilityEvents = allEvents?.filter(e => e.type === "available") || [];
  const blockedEvents = allEvents?.filter(e => 
    e.type === "blocked" || e.type === "personal" || e.type === "holiday" || e.type === "google"
  ) || [];

  // Get all appointments for the date range
  const { data: existingAppointments } = await supabase
    .from("appointments")
    .select("requested_date_time")
    .eq("doctor_id", doctorId)
    .in("status", ["pending", "accepted", "confirmed"]);

  // Group appointments by date
  const appointmentsByDate: Record<string, Set<string>> = {};
  
  // Helper function to round time to nearest 30-minute slot
  const roundToNearestSlot = (hour: number, minute: number): { hour: number; minute: number } => {
    if (minute < 15) {
      return { hour, minute: 0 };
    } else if (minute < 45) {
      return { hour, minute: 30 };
    } else {
      // Handle hour overflow
      const newHour = hour + 1;
      return { hour: newHour >= 24 ? 0 : newHour, minute: 0 };
    }
  };
  
  if (existingAppointments) {
    existingAppointments.forEach((apt) => {
      const utcDate = new Date(apt.requested_date_time);
      // Convert UTC time to Phoenix timezone
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
        if (dates.includes(localDateStr)) {
          if (!appointmentsByDate[localDateStr]) {
            appointmentsByDate[localDateStr] = new Set();
          }
          // Round to nearest 30-minute slot to match calendar display
          const rounded = roundToNearestSlot(parseInt(hour), parseInt(minute));
          const timeStr = `${String(rounded.hour).padStart(2, "0")}:${String(rounded.minute).padStart(2, "0")}`;
          appointmentsByDate[localDateStr].add(timeStr);
        }
      }
    });
  }

  // Get recurring availability
  const { data: recurringAvailability } = await supabase
    .from("doctor_availability")
    .select("day_of_week, start_time, end_time")
    .eq("doctor_id", doctorId)
    .eq("is_available", true)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  // Process each date
  const availabilityByDate: Record<string, { availableSlots: string[]; bookedSlots: string[] }> = {};
  const nowInDoctorTZ = getNowInTimezone(doctorTimezone);
  const todayInDoctorTZ = nowInDoctorTZ.toISOString().split('T')[0];

  dates.forEach((dateStr) => {
    const isToday = dateStr === todayInDoctorTZ;
    const minAllowedTime = isToday ? new Date(nowInDoctorTZ.getTime() + 3 * 60 * 60 * 1000) : null;
    
    const bookedTimes = appointmentsByDate[dateStr] || new Set<string>();
    const availableSlots: string[] = [];
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    // Extract blocked time slots for this date (times are in doctor's timezone)
    const dateBlockedEvents = blockedEvents.filter(e => e.date === dateStr);
    const blockedTimes = new Set<string>();
    dateBlockedEvents.forEach((event) => {
      const [startHour, startMin] = event.start_time.split(":").map(Number);
      const [endHour, endMin] = event.end_time.split(":").map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
        blockedTimes.add(timeStr);
        
        currentMin += APPOINTMENT_DURATION_MINUTES;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    });

    // Check for specific availability events for this date
    const dateEvents = availabilityEvents?.filter(e => e.date === dateStr) || [];
    
    if (dateEvents.length > 0) {
      dateEvents.forEach((event) => {
        // Times in event are in doctor's timezone (Phoenix)
        const [startHour, startMin] = event.start_time.split(":").map(Number);
        const [endHour, endMin] = event.end_time.split(":").map(Number);
        
        // Generate 30-minute slots in doctor's timezone
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
          
          // Check if this slot is not booked AND not blocked
          if (!bookedTimes.has(timeStr) && !blockedTimes.has(timeStr)) {
            // Check if adding 30 minutes would exceed the end time
            let slotEndHour = currentHour;
            let slotEndMin = currentMin + APPOINTMENT_DURATION_MINUTES;
            if (slotEndMin >= 60) {
              slotEndHour += Math.floor(slotEndMin / 60);
              slotEndMin = slotEndMin % 60;
            }
            
            if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMin <= endMin)) {
              // For today, check if slot is at least 3 hours from now in doctor's timezone
              if (minAllowedTime) {
                const slotDateTime = createDateInTimezone(dateStr, timeStr, doctorTimezone);
                if (slotDateTime >= minAllowedTime) {
                  availableSlots.push(timeStr);
                }
              } else {
                availableSlots.push(timeStr);
              }
            }
          }
          
          // Move to next 30-minute slot
          currentMin += APPOINTMENT_DURATION_MINUTES;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
      });
    } else if (recurringAvailability) {
      // Use recurring availability
      const dayRecurring = recurringAvailability.filter(r => r.day_of_week === dayOfWeek);
      
      dayRecurring.forEach((availability) => {
        // Times in availability are in doctor's timezone (Phoenix)
        const [startHour, startMin] = availability.start_time.split(":").map(Number);
        const [endHour, endMin] = availability.end_time.split(":").map(Number);
        
        // Generate 30-minute slots in doctor's timezone
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
          
          // Check if this slot is not booked AND not blocked
          if (!bookedTimes.has(timeStr) && !blockedTimes.has(timeStr)) {
            // Check if adding 30 minutes would exceed the end time
            let slotEndHour = currentHour;
            let slotEndMin = currentMin + APPOINTMENT_DURATION_MINUTES;
            if (slotEndMin >= 60) {
              slotEndHour += Math.floor(slotEndMin / 60);
              slotEndMin = slotEndMin % 60;
            }
            
            if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMin <= endMin)) {
              // For today, check if slot is at least 3 hours from now in doctor's timezone
              if (minAllowedTime) {
                const slotDateTime = createDateInTimezone(dateStr, timeStr, doctorTimezone);
                if (slotDateTime >= minAllowedTime) {
                  availableSlots.push(timeStr);
                }
              } else {
                availableSlots.push(timeStr);
              }
            }
          }
          
          // Move to next 30-minute slot
          currentMin += APPOINTMENT_DURATION_MINUTES;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
      });
    }

    availableSlots.sort();
    const bookedSlotsArray = Array.from(bookedTimes).sort();
    
    // Only include dates that have available slots
    if (availableSlots.length > 0) {
      availabilityByDate[dateStr] = {
        availableSlots,
        bookedSlots: bookedSlotsArray,
      };
    }
  });

  return NextResponse.json({
    success: true,
    doctor: {
      id: doctor.id,
      name: `${doctor.first_name} ${doctor.last_name}`,
      specialty: doctor.specialty,
      timezone: doctorTimezone,
    },
    availabilityByDate,
    availableDates: Object.keys(availabilityByDate),
  });
}


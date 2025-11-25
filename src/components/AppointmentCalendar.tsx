"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface AppointmentCalendarProps {
  selectedDate: string | null;
  selectedTime: string | null;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
  doctorId?: string;
}

export default function AppointmentCalendar({
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  doctorId,
}: AppointmentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Fetch available dates for the current month and next month
  useEffect(() => {
    const fetchAvailableDates = async () => {
      setLoading(true);
      try {
        const dates = new Set<string>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch for current month
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const currentMonthDays = currentMonthEnd.getDate();
        
        // Fetch for next month
        const nextMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        const nextMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);
        const nextMonthDays = nextMonthEnd.getDate();
        
        // Helper function to check availability for a date
        const checkDateAvailability = async (year: number, month: number, day: number): Promise<string | null> => {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split("T")[0];
          
          // Skip past dates
          if (date < today) return null;
          
          try {
            const response = await fetch(
              `/api/get-doctor-availability?date=${dateStr}&doctorId=${doctorId || ""}`
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.availableSlots && data.availableSlots.length > 0) {
                if (!timezone && data.doctor?.timezone) {
                  setTimezone(data.doctor.timezone);
                }
                return dateStr;
              }
            }
          } catch (error) {
            console.error(`Error fetching availability for ${dateStr}:`, error);
          }
          return null;
        };
        
        // Create array of all dates to check (current month + next month)
        const datePromises: Promise<string | null>[] = [];
        
        // Add all days in current month
        for (let day = 1; day <= currentMonthDays; day++) {
          datePromises.push(
            checkDateAvailability(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day
            )
          );
        }
        
        // Add all days in next month
        for (let day = 1; day <= nextMonthDays; day++) {
          datePromises.push(
            checkDateAvailability(
              nextMonthStart.getFullYear(),
              nextMonthStart.getMonth(),
              day
            )
          );
        }
        
        // Wait for all requests to complete in parallel
        const results = await Promise.all(datePromises);
        results.forEach((dateStr) => {
          if (dateStr) {
            dates.add(dateStr);
          }
        });
        
        setAvailableDates(dates);
      } catch (error) {
        console.error("Error fetching available dates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableDates();
  }, [currentMonth, doctorId, timezone]);

  // Fetch booked appointments for current and next month
  useEffect(() => {
    const fetchBookedAppointments = async () => {
      try {
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const nextMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);
        
        const startDate = currentMonthStart.toISOString().split("T")[0];
        const endDate = nextMonthEnd.toISOString().split("T")[0];

        const response = await fetch(
          `/api/get-booked-appointments?startDate=${startDate}&endDate=${endDate}&doctorId=${doctorId || ""}`
        );

        if (response.ok) {
          const data = await response.json();
          setBookedSlots(data.bookedSlots || {});
        }
      } catch (error) {
        console.error("Error fetching booked appointments:", error);
      }
    };

    fetchBookedAppointments();
  }, [currentMonth, doctorId]);

  // Fetch available times when date is selected
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedDate) {
        setAvailableTimes([]);
        setBookedTimes([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/get-doctor-availability?date=${selectedDate}&doctorId=${doctorId || ""}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setAvailableTimes(data.availableSlots || []);
          setBookedTimes(data.bookedSlots || []);
          if (data.doctor?.timezone) {
            setTimezone(data.doctor.timezone);
          }
        } else {
          setAvailableTimes([]);
          setBookedTimes([]);
        }
      } catch (error) {
        console.error("Error fetching available times:", error);
        setAvailableTimes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableTimes();
  }, [selectedDate, doctorId]);

  const handleDateClick = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const dateStr = date.toISOString().split("T")[0];
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return; // Don't allow selecting past dates
    }
    
    // Only allow selection if date has available slots
    if (availableDates.has(dateStr)) {
      onDateSelect(dateStr);
      onTimeSelect(""); // Reset time selection
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    const formatted = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formatted;
  };

  // Normalize time format for comparison (HH:MM)
  const normalizeTime = (timeStr: string) => {
    // Ensure format is HH:MM
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return timeStr;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-[#11161c] border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
            <h3 className="text-lg font-semibold text-white">{monthName}</h3>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="text-center text-sm font-medium text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const date = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
              );
              const dateStr = date.toISOString().split("T")[0];
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = date < today;
              const isAvailable = availableDates.has(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  disabled={isPast || !isAvailable}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all relative ${
                    isSelected
                      ? "bg-primary-teal text-black shadow-lg scale-105"
                      : isAvailable && !isPast
                      ? "bg-white/5 text-white hover:bg-white/10 cursor-pointer border border-white/10"
                      : "bg-white/5 text-gray-500 cursor-not-allowed opacity-50 border border-white/5"
                  }`}
                >
                  {day}
                  {isAvailable && !isPast && (
                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-teal rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Times shown in your timezone: {timezone.replace("_", " ")}
          </p>
        </div>

        {/* Time slots */}
        <div className="bg-[#11161c] border border-white/10 rounded-lg p-6">
          {selectedDate ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">
                Selected: {new Date(selectedDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                </div>
              ) : (availableTimes.length > 0 || bookedTimes.length > 0) ? (
                <>
                  <p className="text-sm text-gray-400 mb-4">Times Available</p>
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {(() => {
                      // Combine available and booked times, then sort
                      const allTimes = new Set([...availableTimes, ...bookedTimes]);
                      const sortedTimes = Array.from(allTimes).sort();
                      
                      return sortedTimes.map((time) => {
                        const isBooked = bookedTimes.includes(time);
                        const isPast = (() => {
                          if (!selectedDate) return false;
                          const today = new Date();
                          const selectedDateObj = new Date(selectedDate);
                          const isToday = selectedDateObj.toDateString() === today.toDateString();
                          
                          if (isToday) {
                            const [hours, minutes] = time.split(":").map(Number);
                            const timeSlot = new Date(today);
                            timeSlot.setHours(hours, minutes, 0, 0);
                            const threeHoursFromNow = new Date(today.getTime() + 3 * 60 * 60 * 1000);
                            return timeSlot < threeHoursFromNow;
                          }
                          return false;
                        })();

                        return (
                          <button
                            key={time}
                            onClick={() => !isPast && !isBooked && onTimeSelect(normalizeTime(time))}
                            disabled={isPast || isBooked}
                            className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all relative ${
                              isBooked
                                ? "border-red-500/50 bg-red-500/10 text-red-400 cursor-not-allowed opacity-75"
                                : isPast
                                ? "border-white/10 text-gray-500 bg-white/5 cursor-not-allowed opacity-50"
                                : normalizeTime(selectedTime || "") === normalizeTime(time)
                                ? "border-primary-teal bg-primary-teal/20 text-primary-teal"
                                : "border-white/20 text-white hover:border-primary-teal/50 hover:bg-primary-teal/10"
                            }`}
                            title={isBooked ? "This time slot is already booked" : isPast ? "This time has passed" : ""}
                          >
                            {formatTime(time)}
                            {isBooked && (
                              <span className="absolute top-1 right-1 text-xs font-semibold text-red-400">Booked</span>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Clock size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No available times for this date</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Clock size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Select a date to see available times</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


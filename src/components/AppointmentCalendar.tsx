"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface AppointmentCalendarProps {
  selectedDate: string | null;
  selectedTime: string | null;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
  doctorId?: string;
  mode?: "both" | "date" | "time";
}

export default function AppointmentCalendar({
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  doctorId,
  mode = "both",
}: AppointmentCalendarProps) {
  // Initialize to today's month to ensure calendar always starts on current month
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [providerTimezone, setProviderTimezone] = useState("America/Phoenix");
  const [patientTimezone, setPatientTimezone] = useState<string>(() => {
    // Detect patient's local timezone
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  });
  const [autoNavigateCount, setAutoNavigateCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  // Ensure calendar always starts on today's month on initial load
  useEffect(() => {
    const today = new Date();
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Only reset to today's month on initial mount if we're not already there
    // This prevents the calendar from starting on a wrong month
    if (currentMonthStart.getTime() !== todayMonth.getTime()) {
      setCurrentMonth(todayMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally exclude currentMonth from deps

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Format today as YYYY-MM-DD for comparison (avoid timezone issues)
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Calculate date range for current month and next month
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const nextMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);
        
        // Format dates as YYYY-MM-DD
        const startDate = currentMonthStart.toISOString().split('T')[0];
        const endDate = nextMonthEnd.toISOString().split('T')[0];
        
        // Make a single batch request for the entire date range
        const response = await fetch(
          `/api/get-doctor-availability?startDate=${startDate}&endDate=${endDate}&doctorId=${doctorId || ""}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Set provider timezone if available
          if (data?.doctor?.timezone) {
            setProviderTimezone(data.doctor.timezone);
          }
          
          // Convert availableDates array to Set
          const dates = new Set<string>(data?.availableDates || []);
          
          // Filter out past dates using string comparison to avoid timezone issues
          const filteredDates = new Set<string>();
          dates.forEach((dateStr) => {
            // Use string comparison to avoid timezone conversion issues
            if (dateStr >= todayStr) {
              filteredDates.add(dateStr);
            }
          });
          
          // IMPORTANT: Always include today's date so patients can see today's availability
          // This ensures the calendar doesn't appear completely empty on the current day
          filteredDates.add(todayStr);
          
          setAvailableDates(filteredDates);
          
          // Check if current month is today's month
          const isCurrentMonthToday = today.getMonth() === currentMonth.getMonth() && 
                                      today.getFullYear() === currentMonth.getFullYear();
          
          // Check if current month has any available dates
          const currentMonthStartDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const currentMonthEndDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
          const currentMonthStartStr = currentMonthStartDate.toISOString().split('T')[0];
          const currentMonthEndStr = currentMonthEndDate.toISOString().split('T')[0];
          
          // Check if there are any available dates in the current month
          let hasDatesInCurrentMonth = false;
          filteredDates.forEach((dateStr) => {
            if (dateStr >= currentMonthStartStr && dateStr <= currentMonthEndStr) {
              hasDatesInCurrentMonth = true;
            }
          });
          
          // IMPORTANT: Never auto-navigate away from today's month
          // Only auto-navigate if:
          // 1. Current month is NOT today's month
          // 2. No dates in current month
          // 3. We have future dates available
          // 4. We haven't exceeded auto-navigate limit
          if (!isCurrentMonthToday && !hasDatesInCurrentMonth && filteredDates.size > 0 && autoNavigateCount < 12) {
            // Find the earliest available date
            const sortedDates = Array.from(filteredDates).sort();
            if (sortedDates.length > 0) {
              const earliestDate = new Date(sortedDates[0] + 'T00:00:00');
              
              // Only navigate if the earliest date is in a different month
              if (earliestDate.getMonth() !== currentMonth.getMonth() || 
                  earliestDate.getFullYear() !== currentMonth.getFullYear()) {
                // Navigate to the month of the earliest available date
                setCurrentMonth(new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1));
                setAutoNavigateCount(prev => prev + 1);
                return; // Exit early, will trigger re-fetch with new month
              }
            }
          }
          
          // If we're on today's month but it's not showing, ensure we stay on today's month
          if (isCurrentMonthToday && !hasDatesInCurrentMonth && autoNavigateCount > 0) {
            // Reset to today's month if we accidentally navigated away
            const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            if (currentMonth.getMonth() !== todayMonth.getMonth() || 
                currentMonth.getFullYear() !== todayMonth.getFullYear()) {
              setCurrentMonth(todayMonth);
              setAutoNavigateCount(0);
            }
          }
          
          // Reset auto-navigate count if we found dates in current month
          if (hasDatesInCurrentMonth) {
            setAutoNavigateCount(0);
          }
        } else {
          console.error("Error fetching available dates:", await response.text());
          setAvailableDates(new Set());
        }
      } catch (error) {
        console.error("Error fetching available dates:", error);
        setAvailableDates(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableDates();
  }, [currentMonth, doctorId, autoNavigateCount]);

  // Fetch booked appointments for current and next month
  // Fetch booked appointments was previously here; removed unused state to reduce bundle size and warnings.

  // Fetch available times when date is selected
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      setBookedTimes([]);
      setLoadingTimes(false);
      return;
    }

    // Set loading immediately and clear previous results
    setAvailableTimes([]);
    setBookedTimes([]);
    setLoadingTimes(true);

    // Use AbortController to cancel previous requests if date changes
    const abortController = new AbortController();

    const fetchAvailableTimes = async () => {
      try {
        const response = await fetch(
          `/api/get-doctor-availability?date=${selectedDate}&doctorId=${doctorId || ""}`,
          { signal: abortController.signal }
        );
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          // Times from API are in provider timezone (Phoenix)
          // Convert to patient's local timezone for display
          const providerTZ = data.doctor?.timezone || "America/Phoenix";
          setProviderTimezone(providerTZ);
          
          // Convert times from provider timezone to patient timezone
          const convertedAvailableTimes = convertTimesToPatientTimezone(
            data.availableSlots || [],
            selectedDate,
            providerTZ,
            patientTimezone
          );
          const convertedBookedTimes = convertTimesToPatientTimezone(
            data.bookedSlots || [],
            selectedDate,
            providerTZ,
            patientTimezone
          );
          
          setAvailableTimes(convertedAvailableTimes);
          setBookedTimes(convertedBookedTimes);
        } else {
          setAvailableTimes([]);
          setBookedTimes([]);
        }
      } catch (error: unknown) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error("Error fetching available times:", error);
        if (!abortController.signal.aborted) {
          setAvailableTimes([]);
          setBookedTimes([]);
        }
      } finally {
        // Only clear loading if not aborted
        if (!abortController.signal.aborted) {
          setLoadingTimes(false);
        }
      }
    };

    fetchAvailableTimes();
    
    // Cleanup: abort request if date changes before it completes
    return () => {
      abortController.abort();
    };
  }, [selectedDate, doctorId]);

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    // Format date string directly without timezone conversion to avoid off-by-one errors
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // Check if date is in the past
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return; // Don't allow selecting past dates
    }
    
    // Only allow selection if date has available slots
    if (availableDates.has(dateStr)) {
      // Immediately clear previous times and show loading
      setAvailableTimes([]);
      setBookedTimes([]);
      setLoadingTimes(true);
      onDateSelect(dateStr);
      onTimeSelect(""); // Reset time selection
    }
  };

  // Convert times from provider timezone to patient timezone
  const convertTimesToPatientTimezone = (
    times: string[],
    date: string,
    providerTZ: string,
    patientTZ: string
  ): string[] => {
    if (providerTZ === patientTZ) {
      return times; // No conversion needed
    }

    const convertedTimes: string[] = [];
    
    times.forEach((timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const [year, month, day] = date.split("-").map(Number);
      
      // Create a date in provider timezone
      // We'll create a UTC date that represents this time in provider timezone
      const providerFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: providerTZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Find the UTC time that, when displayed in provider timezone, equals our target
      const approximateUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      
      let bestUTC: Date | null = null;
      for (let offsetHours = -12; offsetHours <= 12; offsetHours++) {
        const testUTC = new Date(approximateUTC.getTime() + offsetHours * 60 * 60 * 1000);
        const providerParts = providerFormatter.formatToParts(testUTC);
        
        const testYear = parseInt(providerParts.find(p => p.type === 'year')?.value || '0');
        const testMonth = parseInt(providerParts.find(p => p.type === 'month')?.value || '0');
        const testDay = parseInt(providerParts.find(p => p.type === 'day')?.value || '0');
        const testHour = parseInt(providerParts.find(p => p.type === 'hour')?.value || '0');
        const testMinute = parseInt(providerParts.find(p => p.type === 'minute')?.value || '0');
        
        if (testYear === year && testMonth === month && testDay === day && 
            testHour === hours && testMinute === minutes) {
          bestUTC = testUTC;
          break;
        }
      }
      
      if (bestUTC) {
        // Now convert this UTC time to patient timezone
        const patientFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: patientTZ,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        const patientParts = patientFormatter.formatToParts(bestUTC);
        const patientHour = parseInt(patientParts.find(p => p.type === 'hour')?.value || '0');
        const patientMinute = parseInt(patientParts.find(p => p.type === 'minute')?.value || '0');
        
        convertedTimes.push(`${String(patientHour).padStart(2, '0')}:${String(patientMinute).padStart(2, '0')}`);
      } else {
        // Fallback: use original time
        convertedTimes.push(timeStr);
      }
    });
    
    // Remove duplicates and sort
    return Array.from(new Set(convertedTimes)).sort();
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
    setAutoNavigateCount(0); // Reset auto-navigate count when user manually navigates
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
  const effectiveMode = isMobile ? mode : "both";
  const showCalendar = effectiveMode !== "time";
  const showTimes = effectiveMode !== "date";

  return (
    <div className="w-full">
      <div className={`grid grid-cols-1 ${showCalendar && showTimes ? "lg:grid-cols-2" : ""} gap-4 sm:gap-6`}>
        {/* Calendar */}
        {showCalendar && (
        <div className="bg-[#11161c] border border-white/10 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <button
              onClick={() => navigateMonth("prev")}
              disabled={loading}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="text-gray-400 sm:w-5 sm:h-5" />
            </button>
            <h3 className="text-base font-semibold text-white sm:text-lg">{monthName}</h3>
            <button
              onClick={() => navigateMonth("next")}
              disabled={loading}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} className="text-gray-400 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="py-1 text-xs font-medium text-center text-gray-400 sm:text-sm sm:py-2"
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
            {loading ? (
              // Show shimmer placeholders while loading
              Array.from({ length: daysInMonth }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="border-2 rounded-lg aspect-square border-white/10 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer"
                />
              ))
            ) : (
              Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const date = new Date(year, month, day);
                // Format date string directly without timezone conversion to avoid off-by-one errors
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                // Compare as strings to avoid timezone issues (YYYY-MM-DD format)
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const isPast = dateStr < todayStr;
                const isAvailable = availableDates.has(dateStr);
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    disabled={isPast || !isAvailable}
                    className={`aspect-square rounded-lg text-xs sm:text-sm font-medium transition-all relative ${
                      isSelected
                        ? "bg-primary-teal text-black shadow-lg scale-105"
                        : isAvailable && !isPast
                        ? "bg-white/5 text-white hover:bg-white/10 cursor-pointer border border-white/10"
                        : "bg-white/5 text-gray-500 cursor-not-allowed opacity-50 border border-white/5"
                    }`}
                  >
                    {day}
                    {isAvailable && !isPast && (
                      <span className="absolute bottom-0.5 sm:bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-teal rounded-full" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <p className="text-[10px] sm:text-xs text-gray-400 mt-3 sm:mt-4 text-center">
            Times shown in your timezone: {patientTimezone.replace("_", " ")}
          </p>
        </div>
        )}

        {/* Time slots */}
        {showTimes && (
        <div className="bg-[#11161c] border border-white/10 rounded-lg p-4 sm:p-6">
          {selectedDate ? (
            <>
              <h3 className="mb-2 text-base font-semibold text-white sm:text-lg">
                Selected: {new Date(selectedDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              {loadingTimes ? (
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="w-24 h-4 rounded bg-white/10 animate-pulse" />
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="py-2 sm:py-3 px-2 sm:px-4 rounded-lg border-2 border-white/10 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer min-h-[48px]"
                      />
                    ))}
                  </div>
                </div>
              ) : (availableTimes.length > 0 || bookedTimes.length > 0) ? (
                <>
                  <p className="mb-3 text-xs text-gray-400 sm:text-sm sm:mb-4">Times Available</p>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2">
                    {(() => {
                      // Combine available and booked times, then sort
                      const allTimes = new Set([...availableTimes, ...bookedTimes]);
                      const sortedTimes = Array.from(allTimes).sort();
                      
                      return sortedTimes.map((time) => {
                        const isBooked = bookedTimes.includes(time);
                        const isPast = (() => {
                          if (!selectedDate) return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          const isToday = selectedDate === todayStr;
                          
                          if (isToday) {
                            const [hours, minutes] = time.split(":").map(Number);
                            const now = new Date();
                            const timeSlot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
                            const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
                            return timeSlot < threeHoursFromNow;
                          }
                          return false;
                        })();

                        return (
                          <button
                            key={time}
                            onClick={() => !isPast && !isBooked && onTimeSelect(normalizeTime(time))}
                            disabled={isPast || isBooked}
                            className={`py-2 sm:py-3 px-2 sm:px-4 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all relative flex flex-col items-center justify-center min-h-[48px] ${
                              isBooked
                                ? "border-red-500/50 bg-red-500/10 cursor-not-allowed"
                                : isPast
                                ? "border-white/10 text-gray-500 bg-white/5 cursor-not-allowed opacity-50"
                                : normalizeTime(selectedTime || "") === normalizeTime(time)
                                ? "border-primary-teal bg-primary-teal/20 text-primary-teal"
                                : "border-white/20 text-white hover:border-primary-teal/50 hover:bg-primary-teal/10"
                            }`}
                            title={isBooked ? "This time slot is already booked" : isPast ? "This time has passed" : ""}
                          >
                            {isBooked && (
                              <span className="text-[9px] sm:text-[10px] font-bold text-red-400 mb-0.5 uppercase tracking-wide">Booked</span>
                            )}
                            <span className={isBooked ? "text-red-400/70" : ""}>{formatTime(time)}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400 sm:py-8">
                  <Clock size={24} className="mb-2 opacity-50 sm:w-8 sm:h-8" />
                  <p className="text-xs sm:text-sm">No available times for this date</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400 sm:py-8">
              <Clock size={24} className="mb-2 opacity-50 sm:w-8 sm:h-8" />
              <p className="text-xs sm:text-sm">Select a date to see available times</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}


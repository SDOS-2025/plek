import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Building2,
  Calendar,
  Clock,
  Users,
  Projector,
  Wifi,
  Square,
  CalendarDays,
  CalendarClock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import api from "../api";
import { DateTime } from "luxon";
import Toast from "../components/AlertToast";
import { usePolicies } from "../context/PolicyProvider";
import { generateTimeSlotsFromPolicy } from "../utils/institutePolicies";

// Utility function to properly capitalize amenity names
const formatAmenityName = (name) => {
  if (!name) return "";

  // Handle special cases like "TV", "WiFi", etc.
  const specialCases = {
    wifi: "WiFi",
    tv: "TV",
    hdmi: "HDMI",
    usb: "USB",
    ac: "AC",
  };

  const lowerName = name.toLowerCase();
  if (specialCases[lowerName]) {
    return specialCases[lowerName];
  }

  // Otherwise capitalize first letter of each word
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const BookingModal = ({ room, onClose }) => {
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // New states for handling time slot availability
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [timeSlotError, setTimeSlotError] = useState(null);

  // Get institute policies from context
  const {
    policies,
    loading: loadingPolicies,
    error: policiesError,
  } = usePolicies();

  // Initialize date using Luxon in IST timezone
  const [date, setDate] = useState(
    DateTime.now().setZone("Asia/Kolkata").toISODate()
  );

  // Add alert state
  const [alert, setAlert] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // Generate dates based on booking window from policies
  const generateDates = () => {
    const dates = [];
    const today = DateTime.now().setZone("Asia/Kolkata");
    const daysAhead = policies?.booking_opening_days || 30; // Use policy or default to 30 days

    for (let i = 0; i < daysAhead; i++) {
      const date = today.plus({ days: i });
      dates.push({
        value: date.toISODate(),
        label: date.toLocaleString({
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
    }

    return dates;
  };

  // Update available dates when policies change
  const availableDates = useMemo(
    () => generateDates(),
    [policies?.booking_opening_days]
  );

  // Fetch available time slots when date changes
  const fetchAvailableTimeSlots = async (selectedDate) => {
    try {
      setLoadingTimeSlots(true);
      setTimeSlotError(null);
      setSelectedTimeSlots([]); // Reset selected time slots

      if (!policies) {
        throw new Error("Unable to load institute policies");
      }

      // Generate time slots based on working hours from policies
      const allTimeSlots = generateTimeSlotsFromPolicy(policies);

      // Ensure date is in YYYY-MM-DD format for API
      const formattedDate = DateTime.fromISO(selectedDate)
        .setZone("Asia/Kolkata")
        .toISODate();

      // Get current date and time in IST
      const now = DateTime.now().setZone("Asia/Kolkata");
      const isToday = now.toISODate() === formattedDate;

      // API call to get bookings for this room on the selected date
      const response = await api.get(
        `/rooms/${room.id}/?date=${formattedDate}`
      );

      // Get the bookings from API response
      const bookings = response.data.bookings || [];
      console.log("Received bookings:", bookings);

      // Filter to only include APPROVED bookings (exclude cancelled ones)
      const approvedBookings = bookings.filter(
        (booking) =>
          (booking.status === "APPROVED" || booking.status === "approved") &&
          booking.status !== "CANCELLED" &&
          booking.status !== "cancelled"
      );
      console.log("Approved bookings:", approvedBookings);

      // Extract time ranges from APPROVED bookings data for more reliable comparison
      const bookedTimeRanges = approvedBookings.map((booking) => {
        // Convert ISO strings to DateTime objects in IST timezone
        const start = DateTime.fromISO(booking.start_time).setZone(
          "Asia/Kolkata"
        );
        const end = DateTime.fromISO(booking.end_time).setZone("Asia/Kolkata");

        // Format to 24-hour format for easier comparison
        return {
          startHour: start.hour,
          endHour: end.hour,
          startMinute: start.minute,
          endMinute: end.minute,
        };
      });

      console.log("Booked time ranges:", bookedTimeRanges);

      // Create array with both available and booked slots
      const slotsWithStatus = allTimeSlots.map((time) => {
        // Parse the time slot string to get start and end times in 24h format
        const parseTimeSlot = (timeSlot) => {
          const [startStr, endStr] = timeSlot.split(" - ");

          // Parse hours and AM/PM
          const startMatch = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          const endMatch = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);

          if (!startMatch || !endMatch) return null;

          let startHour = parseInt(startMatch[1]);
          const startMinute = parseInt(startMatch[2]);
          const startPeriod = startMatch[3].toUpperCase();

          let endHour = parseInt(endMatch[1]);
          const endMinute = parseInt(endMatch[2]);
          const endPeriod = endMatch[3].toUpperCase();

          // Convert to 24-hour format
          if (startPeriod === "PM" && startHour !== 12) startHour += 12;
          if (startPeriod === "AM" && startHour === 12) startHour = 0;

          if (endPeriod === "PM" && endHour !== 12) endHour += 12;
          if (endPeriod === "AM" && endHour === 12) endHour = 0;

          return {
            startHour,
            startMinute,
            endHour,
            endMinute,
          };
        };

        const timeRange = parseTimeSlot(time);
        if (!timeRange) return { time, isBooked: false, isPast: false };

        // Check if this time slot overlaps with any booked time range
        const isBooked = bookedTimeRanges.some((bookedRange) => {
          // Check for overlap:
          // Not (end1 <= start2 or end2 <= start1)
          const slot1Start = timeRange.startHour * 60 + timeRange.startMinute;
          const slot1End = timeRange.endHour * 60 + timeRange.endMinute;
          const slot2Start =
            bookedRange.startHour * 60 + bookedRange.startMinute;
          const slot2End = bookedRange.endHour * 60 + bookedRange.endMinute;

          // Debug logging to find any problems
          const overlaps = !(slot1End <= slot2Start || slot2End <= slot1Start);
          if (overlaps) {
            console.log(
              `Overlap detected: ${time} overlaps with booked slot ${bookedRange.startHour}:${bookedRange.startMinute}-${bookedRange.endHour}:${bookedRange.endMinute}`
            );
          }

          return overlaps;
        });

        // Check if time slot is in the past (only for today)
        let isPast = false;
        if (isToday) {
          const slotStartTime = now.set({
            hour: timeRange.startHour,
            minute: timeRange.startMinute,
          });
          isPast = slotStartTime <= now;
        }

        return {
          time,
          isBooked,
          isPast,
        };
      });

      // Check if all slots for today are either booked or in the past
      const allSlotsUnavailable = slotsWithStatus.every(
        (slot) => slot.isBooked || slot.isPast
      );

      if (isToday && allSlotsUnavailable) {
        // Find the next available date
        const nextAvailableDate = findNextAvailableDate(selectedDate);
        if (nextAvailableDate) {
          setDate(nextAvailableDate);
          // Show message that we're showing the next available day
          setAlert({
            show: true,
            type: "info",
            message:
              "No available slots for today. Showing the next available day.",
          });
          // fetchAvailableTimeSlots will be called again due to the date change effect
          return;
        }
      }

      setAvailableTimeSlots(slotsWithStatus);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      // Fallback to default time slots in case of error
      setTimeSlotError(
        "Failed to load available time slots. Please try again."
      );

      // Use default slots based on policies if available, otherwise fallback
      let defaultSlots;
      if (policies) {
        defaultSlots = generateTimeSlotsFromPolicy(policies).map((time) => ({
          time,
          isBooked: false,
          isPast: false,
        }));
      } else {
        defaultSlots = [
          "9:00 AM - 10:00 AM",
          "10:00 AM - 11:00 AM",
          "11:00 AM - 12:00 PM",
          "12:00 PM - 1:00 PM",
          "1:00 PM - 2:00 PM",
          "2:00 PM - 3:00 PM",
          "3:00 PM - 4:00 PM",
          "4:00 PM - 5:00 PM",
        ].map((time) => ({ time, isBooked: false, isPast: false }));
      }

      setAvailableTimeSlots(defaultSlots);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Function to find the next available date
  const findNextAvailableDate = (currentDate) => {
    const now = DateTime.now().setZone("Asia/Kolkata");
    const currentDateTime =
      DateTime.fromISO(currentDate).setZone("Asia/Kolkata");

    // Return the next day
    return currentDateTime.plus({ days: 1 }).toISODate();
  };

  // Display policy-related warnings
  const policyWarnings = () => {
    if (!policies) return null;

    return (
      <div className="mb-4">
        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle
              size={18}
              className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0"
            />
            <div className="text-sm text-yellow-300">
              <p className="font-medium mb-1">Booking Policies</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Maximum booking duration:{" "}
                  {policies.max_booking_duration_hours} hours
                </li>
                <li>
                  Bookings can be made up to {policies.booking_opening_days}{" "}
                  days in advance
                </li>
                <li>
                  Working hours: {policies.working_hours_start.substring(0, 5)}{" "}
                  to {policies.working_hours_end.substring(0, 5)}
                </li>
                {!policies.allow_backdated_bookings && (
                  <li>Backdated bookings are not allowed</li>
                )}
                <li>
                  {policies.enable_auto_approval ? (
                    <span className="text-green-300">
                      Auto-approval is enabled - bookings will be immediately
                      approved
                    </span>
                  ) : (
                    <span>
                      Administrator approval required for all bookings
                    </span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Fetch available slots when component mounts and when date changes
  useEffect(() => {
    // Only fetch time slots if policies are loaded
    if (!loadingPolicies && policies) {
      fetchAvailableTimeSlots(date);
    }
  }, [date, room.id, policies, loadingPolicies]);

  const handleTimeSlotClick = (slot) => {
    if (slot.isBooked || slot.isPast) return; // Don't allow selecting booked or past slots

    // Check if selecting this slot would exceed max duration from policy
    const maxSlots = policies
      ? Math.ceil(policies.max_booking_duration_hours)
      : 4;

    // Toggle selection
    if (selectedTimeSlots.includes(slot.time)) {
      // Remove slot if already selected
      setSelectedTimeSlots(
        selectedTimeSlots.filter((time) => time !== slot.time)
      );
    } else {
      // Add slot if not selected, and if it doesn't exceed max duration
      if (selectedTimeSlots.length < maxSlots) {
        setSelectedTimeSlots([...selectedTimeSlots, slot.time]);
      } else {
        // Show warning that max duration exceeded
        setAlert({
          show: true,
          type: "warning",
          message: `Maximum booking duration is ${policies.max_booking_duration_hours} hours.`,
        });
      }
    }
  };

  // Reset selected time slots when date changes
  useEffect(() => {
    setSelectedTimeSlots([]);
  }, [date]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedTimeSlots.length === 0) {
      setAlert({
        show: true,
        type: "warning",
        message: "Please select at least one time slot.",
      });
      return;
    }

    // Get the time ranges from selected slots
    const timeRanges = selectedTimeSlots.map((slot) => {
      const [startStr, endStr] = slot.split(" - ");

      // Parse the time string to get 24-hour format values for comparison
      const parseTimeStr = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return null;

        let [, hours, minutes, period] = match;
        hours = parseInt(hours);
        minutes = parseInt(minutes);

        // Convert to 24-hour format
        if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
        if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

        return { hours, minutes, totalMinutes: hours * 60 + minutes };
      };

      const startTime = parseTimeStr(startStr);
      const endTime = parseTimeStr(endStr);

      return {
        start: startStr,
        end: endStr,
        startObj: startTime,
        endObj: endTime,
      };
    });

    // Sort by start time
    timeRanges.sort(
      (a, b) => a.startObj.totalMinutes - b.startObj.totalMinutes
    );

    // Check if selected time slots are continuous
    const isContinuous = timeRanges.every((slot, index) => {
      if (index === 0) return true; // First slot is always OK
      const prevSlot = timeRanges[index - 1];
      // Check if this slot's start time is the same as previous slot's end time
      return slot.startObj.totalMinutes === prevSlot.endObj.totalMinutes;
    });

    if (!isContinuous) {
      setAlert({
        show: true,
        type: "danger",
        message:
          "Please select continuous time slots only. Discontinuous slots cannot be booked together.",
      });
      return;
    }

    // Get first start time and last end time for continuous slots
    const firstStart = timeRanges[0].start;
    const lastEnd = timeRanges[timeRanges.length - 1].end;

    // Create a combined time slot
    const combinedTimeSlot = `${firstStart} - ${lastEnd}`;

    // Parse the combined time slot
    const parseTimeSlot = (timeSlot, dateStr) => {
      const [startStr, endStr] = timeSlot.split(" - ");

      // Parse hours and minutes from the time strings
      const startMatch = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      const endMatch = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);

      if (!startMatch || !endMatch) {
        console.error("Invalid time format:", timeSlot);
        return { start_time: "", end_time: "" };
      }

      let [, startHours, startMinutes, startPeriod] = startMatch;
      let [, endHours, endMinutes, endPeriod] = endMatch;

      startHours = parseInt(startHours);
      startMinutes = parseInt(startMinutes);
      endHours = parseInt(endHours);
      endMinutes = parseInt(endMinutes);

      // Adjust for 12-hour clock
      if (startPeriod.toUpperCase() === "PM" && startHours !== 12)
        startHours += 12;
      if (startPeriod.toUpperCase() === "AM" && startHours === 12)
        startHours = 0;

      if (endPeriod.toUpperCase() === "PM" && endHours !== 12) endHours += 12;
      if (endPeriod.toUpperCase() === "AM" && endHours === 12) endHours = 0;

      // Set hours and minutes using DateTime, maintaining IST timezone
      const startTime = DateTime.fromISO(dateStr).setZone("Asia/Kolkata").set({
        hour: startHours,
        minute: startMinutes,
        second: 0,
        millisecond: 0,
      });

      const endTime = DateTime.fromISO(dateStr).setZone("Asia/Kolkata").set({
        hour: endHours,
        minute: endMinutes,
        second: 0,
        millisecond: 0,
      });

      // Format in the exact format Django expects (ISO 8601)
      // Use toISO() which gives the proper ISO 8601 format with timezone information
      return {
        start_time: startTime.toISO(),
        end_time: endTime.toISO(),
      };
    };

    const timeValues = parseTimeSlot(combinedTimeSlot, date);

    // Create booking details object that matches the backend model
    const bookingDetails = {
      room: room.id,
      start_time: timeValues.start_time,
      end_time: timeValues.end_time,
      status: "PENDING",
      purpose: purpose,
      participants: attendees.toString(),
      attendees_count: parseInt(attendees) || 0,
      notes: notes,
    };

    try {
      console.log("Booking details:", bookingDetails);
      const response = await api.post(`bookings/create/`, bookingDetails);

      if (response.status === 200 || response.status === 201) {
        console.log("Booking successful:", response.data);
        // Set success message based on whether auto-approval is enabled
        const successMessage = policies?.enable_auto_approval
          ? "Booking automatically approved! Your reservation is confirmed."
          : "Booking request submitted successfully! Awaiting administrator approval.";

        setAlert({
          show: true,
          type: "success",
          message: successMessage,
        });
        // Close the modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        console.error("Booking failed:", response.data);
        setAlert({
          show: true,
          type: "danger",
          message: "Failed to book room. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting booking:", error);

      // Extract error message from response if available
      let errorMessage = "An error occurred while booking the room.";

      if (error.response) {
        // Specifically handle conflict errors (status 409)
        if (error.response.status === 409) {
          errorMessage =
            error.response.data.detail ||
            "This time slot was just booked by another user. Please select a different time.";

          // Auto-reload available time slots to show updated availability
          fetchAvailableTimeSlots(date);

          setAlert({
            show: true,
            type: "danger",
            message: errorMessage,
          });
          return;
        }

        // Handle other error responses
        if (error.response.data) {
          // Check for duration validation errors
          if (error.response.data.duration) {
            const durationErrors = error.response.data.duration;
            if (Array.isArray(durationErrors) && durationErrors.length > 0) {
              errorMessage = durationErrors[0];
            } else if (typeof durationErrors === "string") {
              errorMessage = durationErrors;
            }
          }
          // Check for backdated booking error specifically
          else if (
            error.response.data.start_time &&
            error.response.data.start_time.includes(
              "Backdated bookings are not allowed"
            )
          ) {
            errorMessage =
              "Backdated bookings are not allowed. Please select a future time slot.";
          }
          // Check for other validation errors
          else if (error.response.data.time) {
            errorMessage = error.response.data.time;
          }
          // Check for room conflicts
          else if (error.response.data.room) {
            errorMessage = error.response.data.room;
          }
          // Check for general errors
          else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          }
          // If there are other error formats, try to extract them
          else if (typeof error.response.data === "object") {
            // Try to get the first error message from any field
            const firstErrorField = Object.keys(error.response.data)[0];
            if (firstErrorField && error.response.data[firstErrorField]) {
              const fieldErrors = error.response.data[firstErrorField];
              if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                errorMessage = `${firstErrorField}: ${fieldErrors[0]}`;
              } else if (typeof fieldErrors === "string") {
                errorMessage = `${firstErrorField}: ${fieldErrors}`;
              }
            }
          }
        }
      }

      setAlert({
        show: true,
        type: "danger",
        message: errorMessage,
      });
    }
  };

  // Add function to hide alert
  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-plek-dark rounded-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Confirm Booking</h2>
          <p className="text-gray-400">
            Please review and confirm your room booking details
          </p>
        </div>

        {/* Display institute policy warnings */}
        {policyWarnings()}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            {/* Room information */}
            <div className="flex items-center space-x-3 text-gray-300">
              <Building2 size={20} />
              <div>
                <p className="text-sm text-gray-400">Room</p>
                <p>
                  {room.name} - {room.building_name}
                </p>
              </div>
            </div>

            {/* Date picker */}
            <div className="bg-plek-lightgray rounded-lg relative">
              <div
                className="flex items-center justify-between text-gray-300 cursor-pointer p-2 hover:bg-plek-background rounded-lg border border-gray-600 transition-colors"
                onClick={toggleDatePicker}
              >
                <div className="flex items-center space-x-3">
                  <CalendarDays size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p>
                      {availableDates.find((d) => d.value === date)?.label ||
                        date}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${
                    showDatePicker ? "rotate-180" : ""
                  }`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 bg-plek-background rounded-lg shadow-lg p-3 z-10 w-full border border-gray-600">
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {availableDates.map((d, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                          d.value === date
                            ? "bg-plek-purple text-white"
                            : "hover:bg-plek-lightgray active:bg-plek-background"
                        }`}
                        onClick={() => setDate(d.value)}
                      >
                        <span>{d.label}</span>
                        {d.value === date ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Capacity information */}
            <div className="flex items-center space-x-3 text-gray-300">
              <Users size={20} />
              <div>
                <p className="text-sm text-gray-400">Capacity</p>
                <p>{room.capacity} people</p>
              </div>
            </div>

            {/* Selected Time Slots Summary */}
            {selectedTimeSlots.length > 0 && (
              <div className="flex items-center space-x-3 text-gray-300">
                <CalendarClock size={20} />
                <div>
                  <p className="text-sm text-gray-400">Selected Time Slots</p>
                  <div className="font-medium text-white">
                    {selectedTimeSlots.length === 1 ? (
                      <p>{selectedTimeSlots[0]}</p>
                    ) : (
                      <p>{selectedTimeSlots.length} slots selected</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New visual time slot selector with multi-select */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Clock className="mr-2 text-purple-400" size={20} />
            Select Time Slots
            <span className="ml-2 text-sm text-gray-400">
              (Click multiple slots to book consecutive hours)
            </span>
          </h3>

          {loadingTimeSlots || loadingPolicies ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 size={30} className="animate-spin text-purple-500" />
              <span className="ml-2 text-gray-300">
                Loading available slots...
              </span>
            </div>
          ) : policiesError || timeSlotError ? (
            <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-center text-red-300">
              {policiesError || timeSlotError}
            </div>
          ) : availableTimeSlots.length === 0 ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-center text-yellow-300">
              No available time slots for this date
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-plek-purple mr-1.5"></div>
                    <span className="text-sm text-gray-300">Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-gray-600 mr-1.5"></div>
                    <span className="text-sm text-gray-300">Booked</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-green-600 mr-1.5"></div>
                    <span className="text-sm text-gray-300">Selected</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 bg-plek-lightgray p-4 rounded-lg">
                {availableTimeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      relative rounded-lg transition-all overflow-hidden
                      ${
                        slot.isBooked || slot.isPast
                          ? "bg-gray-600 cursor-not-allowed"
                          : selectedTimeSlots.includes(slot.time)
                          ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                          : "bg-plek-purple hover:bg-purple-600 cursor-pointer"
                      }
                    `}
                    onClick={() => handleTimeSlotClick(slot)}
                  >
                    <div className="p-2 text-center h-full flex flex-col justify-center">
                      <p
                        className={`text-xs font-medium ${
                          slot.isBooked || slot.isPast
                            ? "text-gray-400"
                            : "text-white"
                        }`}
                      >
                        {slot.time.split(" - ")[0]}
                      </p>
                      <p
                        className={`text-xs ${
                          slot.isBooked || slot.isPast
                            ? "text-gray-400"
                            : "text-gray-200"
                        }`}
                      >
                        {slot.time.split(" - ")[1]}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    {selectedTimeSlots.includes(slot.time) &&
                      !slot.isBooked &&
                      !slot.isPast && (
                        <div className="absolute bottom-1 right-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}

                    {/* Past indicator */}
                    {slot.isPast && !slot.isBooked && (
                      <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                        <X size={12} className="text-gray-400" />
                      </div>
                    )}

                    {/* Booked indicator */}
                    {slot.isBooked && (
                      <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                        <X size={12} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Amenities section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Available Amenities
          </label>
          <div className="bg-plek-background rounded-lg p-3">
            {room.amenity_names && room.amenity_names.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {room.amenity_names.map((amenityName, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-plek-purple/20 border border-purple-700/30 text-gray-200 text-sm flex items-center hover:bg-plek-purple/30 transition-colors shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-sm bg-purple-400 mr-1.5"></span>
                    {formatAmenityName(amenityName)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No amenities available</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purpose of Booking
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple"
              placeholder="e.g., Team Meeting, Workshop, Training"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Attendees
            </label>
            <input
              type="number"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              max={room.capacity}
              className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple"
              placeholder="Enter number of attendees"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple h-32"
              placeholder="Any special requirements or notes"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-plek-background hover:bg-plek-lightgray rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-plek-purple hover:bg-purple-700 rounded-lg transition-colors"
              disabled={selectedTimeSlots.length === 0 || loadingTimeSlots}
            >
              {policies?.enable_auto_approval ? "Book Now" : "Request Booking"}
            </button>
          </div>
        </form>
      </div>
      {/* Add Toast component */}
      {alert.show && (
        <Toast
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onClose={hideAlert}
        />
      )}
    </div>
  );
};

export default BookingModal;

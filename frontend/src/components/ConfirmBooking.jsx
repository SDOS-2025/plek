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
} from "lucide-react";
import api from "../api";
import { DateTime } from "luxon";

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
  const [timeSlot, setTimeSlot] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // New states for handling time slot availability
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [timeSlotError, setTimeSlotError] = useState(null);

  // Initialize date using Luxon in IST timezone
  const [date, setDate] = useState(
    DateTime.now().setZone("Asia/Kolkata").toISODate()
  );

  // Generate dates for the next 14 days
  const generateDates = () => {
    const dates = [];
    const today = DateTime.now().setZone("Asia/Kolkata");

    for (let i = 0; i < 14; i++) {
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

  const availableDates = generateDates();

  // Fetch available time slots when date changes
  const fetchAvailableTimeSlots = async (selectedDate) => {
    try {
      setLoadingTimeSlots(true);
      setTimeSlotError(null);
      setTimeSlot(""); // Reset selected time slot

      // Define all possible time slots
      const allTimeSlots = [
        "9:00 AM - 10:00 AM",
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "12:00 PM - 1:00 PM",
        "1:00 PM - 2:00 PM",
        "2:00 PM - 3:00 PM",
        "3:00 PM - 4:00 PM",
        "4:00 PM - 5:00 PM",
      ];

      // Ensure date is in YYYY-MM-DD format for API
      const formattedDate = DateTime.fromISO(selectedDate)
        .setZone("Asia/Kolkata")
        .toISODate();

      // API call to get bookings for this room on the selected date
      const response = await api.get(
        `/rooms/${room.id}/?date=${formattedDate}`
      );

      // Get the bookings from API response
      const bookings = response.data.bookings || [];
      console.log("Received bookings:", bookings);

      // Extract booked time slots from bookings data
      const bookedTimeSlots = bookings.map((booking) => {
        // Convert the ISO string to DateTime objects in IST timezone
        const start = DateTime.fromISO(booking.start_time).setZone(
          "Asia/Kolkata"
        );
        const end = DateTime.fromISO(booking.end_time).setZone("Asia/Kolkata");

        // Format hours for 12-hour display with AM/PM
        const startFormatted = start.toFormat("h:mm a");
        const endFormatted = end.toFormat("h:mm a");

        return `${startFormatted} - ${endFormatted}`;
      });

      console.log("Booked time slots:", bookedTimeSlots);

      // Create array with both available and booked slots
      const slotsWithStatus = allTimeSlots.map((time) => {
        // More robust time slot comparison using normalization
        const normalizedTime = time.replace(/\s+/g, " ").toUpperCase();

        const isBooked = bookedTimeSlots.some((slot) => {
          const normalizedSlot = slot.replace(/\s+/g, " ").toUpperCase();
          // Exact comparison to check if time slot is booked
          return normalizedSlot === normalizedTime;
        });

        return {
          time,
          isBooked,
        };
      });

      setAvailableTimeSlots(slotsWithStatus);

      // If we have available slots, select the first available one by default
      const firstAvailable = slotsWithStatus.find((slot) => !slot.isBooked);
      if (firstAvailable) {
        setTimeSlot(firstAvailable.time);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      // Fallback to default time slots in case of error
      setTimeSlotError(
        "Failed to load available time slots. Please try again."
      );
      const defaultSlots = [
        "9:00 AM - 10:00 AM",
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "12:00 PM - 1:00 PM",
        "1:00 PM - 2:00 PM",
        "2:00 PM - 3:00 PM",
        "3:00 PM - 4:00 PM",
        "4:00 PM - 5:00 PM",
      ].map((time) => ({ time, isBooked: false }));

      setAvailableTimeSlots(defaultSlots);
      if (defaultSlots.length > 0) {
        setTimeSlot(defaultSlots[0].time);
      }
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Fetch available slots when component mounts and when date changes
  useEffect(() => {
    fetchAvailableTimeSlots(date);
  }, [date, room.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Parse the time slot to get start and end times
    const parseTimeSlot = (timeSlot, dateStr) => {
      const [startStr, endStr] = timeSlot.split(" - ");

      // Ensure we're working with the correct date in IST
      const baseDate = DateTime.fromISO(dateStr).setZone("Asia/Kolkata");

      // Parse hours and minutes from the time strings
      const [startHours, startMinutes] = startStr
        .match(/(\d+):(\d+)/)
        .slice(1, 3)
        .map(Number);
      const [endHours, endMinutes] = endStr
        .match(/(\d+):(\d+)/)
        .slice(1, 3)
        .map(Number);

      // Adjust for PM times
      const startPeriod = startStr.includes("PM");
      const endPeriod = endStr.includes("PM");

      let startHour = startHours;
      if (startPeriod && startHours !== 12) startHour += 12;
      if (!startPeriod && startHours === 12) startHour = 0;

      let endHour = endHours;
      if (endPeriod && endHours !== 12) endHour += 12;
      if (!endPeriod && endHours === 12) endHour = 0;

      // Set hours and minutes using DateTime, maintaining IST timezone
      const startTime = baseDate.set({
        hour: startHour,
        minute: startMinutes,
        second: 0,
        millisecond: 0,
      });

      const endTime = baseDate.set({
        hour: endHour,
        minute: endMinutes,
        second: 0,
        millisecond: 0,
      });

      return {
        start_time: startTime.toISO({ includeOffset: true }),
        end_time: endTime.toISO({ includeOffset: true }),
      };
    };

    // Get time values from the selected time slot
    const timeValues = parseTimeSlot(timeSlot, date);

    // Get user ID from localStorage
    // const userId = localStorage.getItem("FirstName")

    // if (!userId) {
    //   alert("User information is missing. Please log in again.");
    //   return;
    // }

    // Create booking details object that matches the backend model
    const bookingDetails = {
      room: room.id, // Changed from nested object to simple field
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
        // Show success message
        alert("Booking request sent!");
        onClose();
      } else {
        console.error("Booking failed:", response.data);
        alert("Failed to book room. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("An error occurred while booking the room.");
    }
  };

  // Handle opening dropdowns and closing others
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker) {
      setShowTimePicker(false); // Close time picker when opening date picker
    }
  };

  const toggleTimePicker = () => {
    setShowTimePicker(!showTimePicker);
    if (!showTimePicker) {
      setShowDatePicker(false); // Close date picker when opening time picker
    }
  };

  // Handle date selection with API call
  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setShowDatePicker(false);
    // Fetch time slots is handled by useEffect
  };

  // Utility function to determine if a date is in the past
  const isDateInPast = (dateStr) => {
    const today = DateTime.now().setZone("Asia/Kolkata").startOf("day");
    const checkDate = DateTime.fromISO(dateStr).startOf("day");
    return checkDate < today;
  };

  // Utility function to determine if a time slot is in the past
  const isTimeSlotInPast = (slot, date) => {
    const now = DateTime.now().setZone("Asia/Kolkata");
    const [startTime] = slot.split(" - ");

    // Convert string time like "9 AM" to proper DateTime
    const slotTime = DateTime.fromFormat(startTime, "h a", {
      zone: "Asia/Kolkata",
    });

    // Combine selected date with slot time
    const slotDateTime = DateTime.fromISO(date).set({
      hour: slotTime.hour,
      minute: slotTime.minute,
    });

    return slotDateTime < now;
  };

  // Find the next available day (either today if slots are available or tomorrow)
  const findNextAvailableDay = () => {
    const now = DateTime.now().setZone("Asia/Kolkata");
    const today = now.toISODate();

    // Check if current time is past the last slot of the day (e.g., after 5 PM)
    const lastSlotTime = DateTime.fromFormat("5 PM", "h a", {
      zone: "Asia/Kolkata",
    });
    const lastSlotToday = DateTime.fromISO(today).set({
      hour: lastSlotTime.hour,
      minute: lastSlotTime.minute,
    });

    // If current time is past the last slot, return tomorrow's date
    if (now > lastSlotToday) {
      return now.plus({ days: 1 }).toISODate();
    }

    return today;
  };

  // Update selectedDate to next available day on component mount
  useEffect(() => {
    setDate(findNextAvailableDay());
  }, []);

  // Fetch available time slots for the selected date
  useEffect(() => {
    // ...existing code for fetching time slots...

    // After fetching the slots, filter out past slots if it's today
    const today = DateTime.now().setZone("Asia/Kolkata").toISODate();

    if (date === today) {
      // Filter out past time slots for today
      const availableSlots = availableTimeSlots.filter(
        (slot) => !isTimeSlotInPast(slot.time, date)
      );

      // If no slots available today, automatically advance to tomorrow
      if (availableSlots.length === 0 && availableTimeSlots.length > 0) {
        const tomorrow = DateTime.now()
          .setZone("Asia/Kolkata")
          .plus({ days: 1 })
          .toISODate();
        setDate(tomorrow);
      } else {
        // Update timeSlots with available ones
        setAvailableTimeSlots(availableSlots);
      }
    }
  }, [date]);

  // Handle date change
  const handleDateChange = (offset) => {
    const currentDate = DateTime.fromISO(date);
    const newDate = currentDate.plus({ days: offset }).toISODate();

    // Don't allow selecting dates in the past
    if (!isDateInPast(newDate)) {
      setDate(newDate);
      setTimeSlot(null); // Reset selected time slot when changing date
    }
  };

  // Time slot selection component
  const renderTimeSlots = () => {
    if (availableTimeSlots.length === 0) {
      return (
        <p className="text-gray-400 text-center">
          No available slots for this date
        </p>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-3">
        {availableTimeSlots.map((slot, index) => {
          const isPastSlot = isTimeSlotInPast(slot.time, date);

          return (
            <button
              key={index}
              className={`p-3 rounded-lg text-center ${
                timeSlot === slot.time
                  ? "bg-plek-purple text-white"
                  : isPastSlot
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed" // Grayed out for past slots
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              onClick={() => {
                if (!isPastSlot) {
                  setTimeSlot(slot.time);
                }
              }}
              disabled={isPastSlot} // Disable past slots
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    );
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

        <div className="grid grid-cols-2 gap-6 mb-8">
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
              {/* Date picker trigger */}
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
                        onClick={() => handleDateSelect(d.value)}
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
            {/* Time slot picker */}
            <div className="bg-plek-lightgray rounded-lg relative">
              {/* Time slot picker trigger */}
              <div
                className={`flex items-center justify-between text-gray-300 cursor-pointer p-2 hover:bg-plek-background rounded-lg border border-gray-600 transition-colors ${
                  loadingTimeSlots ? "opacity-75" : ""
                }`}
                onClick={toggleTimePicker}
              >
                <div className="flex items-center space-x-3">
                  <CalendarClock size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Time Slot</p>
                    <p>
                      {loadingTimeSlots
                        ? "Loading..."
                        : timeSlot || "Select a time"}
                    </p>
                  </div>
                </div>
                {loadingTimeSlots ? (
                  <Loader2 size={16} className="animate-spin" />
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
                    className={`transition-transform ${
                      showTimePicker ? "rotate-180" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                )}
              </div>
              {showTimePicker && !loadingTimeSlots && (
                <div className="absolute top-full left-0 mt-2 bg-plek-background rounded-lg shadow-lg p-3 z-10 w-full border border-gray-600">
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {timeSlotError ? (
                      <div className="p-2 text-red-400 text-center">
                        {timeSlotError}
                      </div>
                    ) : availableTimeSlots.length === 0 ? (
                      <div className="p-2 text-yellow-400 text-center">
                        No available time slots for this date
                      </div>
                    ) : (
                      availableTimeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-lg flex justify-between items-center transition-all ${
                            slot.isBooked
                              ? "bg-plek-dark text-gray-500 cursor-not-allowed"
                              : slot.time === timeSlot
                              ? "bg-plek-purple text-white cursor-pointer"
                              : "hover:bg-plek-lightgray active:bg-plek-background cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!slot.isBooked) {
                              setTimeSlot(slot.time);
                              setShowTimePicker(false);
                            }
                          }}
                        >
                          <div className="flex items-center">
                            {slot.isBooked && (
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
                                className="mr-2 text-gray-500"
                              >
                                <rect
                                  x="3"
                                  y="4"
                                  width="18"
                                  height="18"
                                  rx="2"
                                  ry="2"
                                ></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                            )}
                            <span>{slot.time}</span>
                          </div>
                          {!slot.isBooked && slot.time === timeSlot && (
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
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Capacity information */}
            <div className="flex items-center space-x-3 text-gray-300">
              <Users size={20} />
              <div>
                <p className="text-sm text-gray-400">Capacity</p>
                <p>{room.capacity} people</p>
              </div>
            </div>
          </div>
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
              disabled={!timeSlot || loadingTimeSlots}
            >
              Request Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;

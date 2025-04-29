import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  CalendarDays,
  CalendarClock,
  Users,
  Loader2,
  Trash2,
  Clock,
} from "lucide-react";
import api from "../api";
import { DateTime } from "luxon";
import Toast from "../components/AlertToast";

const ModifyBookingModal = ({ booking, onClose, onCancel }) => {
  const [purpose, setPurpose] = useState(booking.purpose || "Team Meeting");
  const [attendees, setAttendees] = useState(booking.attendees || "6");
  const [notes, setNotes] = useState(
    booking.notes || "Need whiteboard markers"
  );
  const [selectedTimeSlots, setSelectedTimeSlots] = useState(
    booking.slot ? [booking.slot] : []
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [date, setDate] = useState(() => {
    try {
      return DateTime.fromFormat(booking.date, "LLLL d, yyyy").toISODate();
    } catch (e) {
      return DateTime.now().toISODate();
    }
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [timeSlotError, setTimeSlotError] = useState(null);
  const [otherUserBookings, setOtherUserBookings] = useState([]);
  const [sameUserBookings, setSameUserBookings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

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

  // Helper function to convert time strings to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutesPart] = timeStr.split(":");
    const minutes = minutesPart.split(" ")[0];
    const period = minutesPart.split(" ")[1];

    let hour = parseInt(hours);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return hour * 60 + parseInt(minutes);
  };

  const availableDates = generateDates();

  const fetchAvailableTimeSlots = async (selectedDate) => {
    try {
      setLoadingTimeSlots(true);
      setTimeSlotError(null);
      const isInitialLoad = selectedTimeSlots.length === 0;

      // Don't clear selection when it's the same date
      if (!isInitialLoad && selectedDate !== date) {
        // Only clear non-current booking slots when date changes
        setSelectedTimeSlots([]);
      }

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

      const formattedDate = DateTime.fromISO(selectedDate).toISODate();
      let roomId = null;

      if (booking.originalBooking && booking.originalBooking.room) {
        if (typeof booking.originalBooking.room === "object") {
          roomId = booking.originalBooking.room.id;
        } else {
          roomId = booking.originalBooking.room;
        }
      } else if (booking.roomId) {
        roomId = booking.roomId;
      } else if (booking.room) {
        roomId =
          typeof booking.room === "object" ? booking.room.id : booking.room;
      }

      if (!roomId) {
        setTimeSlotError("Could not identify the room for this booking");
        setLoadingTimeSlots(false);
        return;
      }

      let currentUserId = null;
      try {
        const userProfileResponse = await api.get("/api/accounts/profile/");
        if (userProfileResponse.status === 200) {
          currentUserId = userProfileResponse.data.id;
          setCurrentUserId(currentUserId);
          console.log("Current user ID:", currentUserId);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }

      const response = await api.get(`/rooms/${roomId}/?date=${formattedDate}`);

      if (!response.data || !response.data.bookings) {
        throw new Error("Invalid response format from API");
      }

      const bookings = response.data.bookings || [];
      console.log("Retrieved bookings:", bookings);
      console.log("Current booking ID:", booking.id); // Debug log the current booking ID

      // Handle case where backend might not return full booking data
      const processedBookings = bookings.map((bookingItem) => {
        return {
          id: bookingItem.id || 0,
          userId: bookingItem.user || null,
          userEmail: bookingItem.user_email || "Unknown user",
          userFirstName: bookingItem.user_first_name || null,
          startTime: DateTime.fromISO(bookingItem.start_time),
          endTime: DateTime.fromISO(bookingItem.end_time),
          status: bookingItem.status || "APPROVED",
          isCurrentBooking: parseInt(bookingItem.id) === parseInt(booking.id),
        };
      });

      // Explicitly log what we're looking for versus what we found
      console.log("Current booking ID we're looking for:", booking.id);
      console.log("All booking IDs available:", bookings.map(b => b.id));
      
      // Log the current booking details after processing
      const currentBookingData = processedBookings.find(b => parseInt(b.id) === parseInt(booking.id));
      console.log("Current booking data found:", currentBookingData);

      // Ensure we're strictly comparing IDs as numbers to avoid type mismatch
      const currentBookingId = parseInt(booking.id);
      console.log("Current booking ID for comparison:", currentBookingId);

      // Explicitly filter out the current booking and rejected bookings when creating same user bookings
      const sameUserBookingsData = bookings.filter((b) => {
        const isCurrentBooking = parseInt(b.id) === currentBookingId;
        const isSameUser = b.user === currentUserId;
        const isRejected = b.status && b.status.toUpperCase() === "REJECTED";
        
        console.log(
          `Booking ${b.id}: ${isSameUser ? "Same user" : "Different user"}, ` +
          `${isCurrentBooking ? "Current booking" : "Not current booking"}, ` +
          `Status: ${b.status}`
        );
        
        // Only include if:
        // 1. Same user AND
        // 2. NOT current booking AND
        // 3. NOT rejected
        return isSameUser && !isCurrentBooking && !isRejected;
      });
      
      // Filter other user bookings to exclude rejected ones
      const otherUserBookingsData = bookings.filter((b) => {
        const isRejected = b.status && b.status.toUpperCase() === "REJECTED";
        return b.user !== currentUserId && !isRejected;
      });
      
      console.log("Same user bookings (filtered):", sameUserBookingsData);
      console.log("Other user bookings:", otherUserBookingsData);
      
      setSameUserBookings(sameUserBookingsData);
      setOtherUserBookings(otherUserBookingsData);

      // Also update the ranges used for time slot calculations
      const sameUserRanges = processedBookings.filter((r) => {
        const isRejected = r.status && r.status.toUpperCase() === "REJECTED";
        return r.userId === currentUserId && 
               parseInt(r.id) !== currentBookingId &&
               !isRejected;
      });

      const otherUserRanges = processedBookings.filter((r) => {
        const isRejected = r.status && r.status.toUpperCase() === "REJECTED";
        return r.userId !== currentUserId && !isRejected;
      });

      const slotsWithStatus = allTimeSlots.map((timeSlot) => {
        const [startStr, endStr] = timeSlot.split(" - ");
        const slotStartMinutes = timeToMinutes(startStr);
        const slotEndMinutes = timeToMinutes(endStr);

        // More clear identification of current booking time slot
        let isCurrentBooking = false;
        
        if (currentBookingData) {
          const bookingStartMinutes = 
            currentBookingData.startTime.hour * 60 + currentBookingData.startTime.minute;
          const bookingEndMinutes = 
            currentBookingData.endTime.hour * 60 + currentBookingData.endTime.minute;
          
          // Consider hourly slots that overlap with current booking
          isCurrentBooking = !(
            slotEndMinutes <= bookingStartMinutes || 
            slotStartMinutes >= bookingEndMinutes
          );
          
          // Log when a slot is identified as part of the current booking
          if (isCurrentBooking) {
            console.log(`Slot ${timeSlot} identified as current booking`);
          }
        }

        const overlapsWithSameUser = sameUserRanges.some(
          (range) =>
            !(
              slotEndMinutes <=
                range.startTime.hour * 60 + range.startTime.minute ||
              slotStartMinutes >= range.endTime.hour * 60 + range.endTime.minute
            )
        );

        const overlapsWithOthers = otherUserRanges.some(
          (range) =>
            !(
              slotEndMinutes <=
                range.startTime.hour * 60 + range.startTime.minute ||
              slotStartMinutes >= range.endTime.hour * 60 + range.endTime.minute
            )
        );

        const overlappingBooking = [...otherUserRanges, ...sameUserRanges].find(
          (range) =>
            !(
              slotEndMinutes <=
                range.startTime.hour * 60 + range.startTime.minute ||
              slotStartMinutes >= range.endTime.hour * 60 + range.endTime.minute
            )
        );

        return {
          time: timeSlot,
          isCurrentBooking,
          isSameUserBooking: overlapsWithSameUser,
          isOtherUserBooking: overlapsWithOthers,
          isBooked:
            (overlapsWithSameUser || overlapsWithOthers) && !isCurrentBooking, // Don't mark current booking as booked
          bookedBy: overlappingBooking ? overlappingBooking.userEmail : null,
          bookingId: overlappingBooking ? overlappingBooking.id : null,
          userId: overlappingBooking ? overlappingBooking.userId : null,
        };
      });

      setAvailableTimeSlots(slotsWithStatus);

      // Pre-select ALL time slots that belong to the current booking
      if (currentBookingData) {
        const currentSlots = slotsWithStatus
          .filter(slot => slot.isCurrentBooking)
          .map(slot => slot.time);
        
        if (currentSlots.length > 0) {
          console.log("Pre-selecting current booking slots:", currentSlots);
          setSelectedTimeSlots(currentSlots);
        } else {
          console.warn("No current booking slots found to pre-select!");
        }
      }
    } catch (error) {
      setTimeSlotError(`Failed to load available time slots: ${error.message}`);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  useEffect(() => {
    // Only clear selections when date changes and not on initial mount
    if (date) {
      fetchAvailableTimeSlots(date);
    }
  }, [date, booking.id]);

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  // Completely rewrite the handleTimeSlotClick function to ensure toggle works properly
  const handleTimeSlotClick = (slot) => {
    // Prevent clicking on other users' bookings that aren't our current booking
    if ((slot.isOtherUserBooking || slot.isSameUserBooking) && !slot.isCurrentBooking) {
      return; // Only prevent clicking if it's someone else's booking and not the current one
    }

    // Explicitly log what's happening for debugging
    console.log(`Clicked on ${slot.time}, isCurrentBooking: ${slot.isCurrentBooking}`);
    console.log(`Current selectedTimeSlots:`, selectedTimeSlots);
    
    // Force create a new array using spread to ensure React sees the change
    if (selectedTimeSlots.includes(slot.time)) {
      // Deselect: Remove this time from selection
      console.log(`Removing ${slot.time} from selection`);
      const newSelection = selectedTimeSlots.filter(time => time !== slot.time);
      console.log(`New selection will be:`, newSelection);
      setSelectedTimeSlots([...newSelection]); // Force new array with spread
    } else {
      // Select: Add this time to selection
      console.log(`Adding ${slot.time} to selection`);
      const newSelection = [...selectedTimeSlots, slot.time];
      console.log(`New selection will be:`, newSelection);
      setSelectedTimeSlots([...newSelection]); // Force new array with spread
    }
  };

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  const parseTimeSlot = (timeSlot, dateStr) => {
    const [startStr, endStr] = timeSlot.split(" - ");
    const baseDate = DateTime.fromISO(dateStr);
    const startMatch = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    const endMatch = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);

    if (!startMatch || !endMatch) {
      return { start_time: "", end_time: "" };
    }

    let [, startHours, startMinutes, startPeriod] = startMatch;
    let [, endHours, endMinutes, endPeriod] = endMatch;

    startHours = parseInt(startHours);
    startMinutes = parseInt(startMinutes);
    endHours = parseInt(endHours);
    endMinutes = parseInt(endMinutes);

    if (startPeriod.toUpperCase() === "PM" && startHours !== 12)
      startHours += 12;
    if (startPeriod.toUpperCase() === "AM" && startHours === 12) startHours = 0;

    if (endPeriod.toUpperCase() === "PM" && endHours !== 12) endHours += 12;
    if (endPeriod.toUpperCase() === "AM" && endHours === 12) endHours = 0;

    const startTime = baseDate.set({ hour: startHours, minute: startMinutes });
    const endTime = baseDate.set({ hour: endHours, minute: endMinutes });

    return {
      start_time: startTime.toISO(),
      end_time: endTime.toISO(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedTimeSlots.length === 0) {
      setAlert({
        show: true,
        type: "warning",
        message: "Please select at least one time slot to book.",
      });
      return;
    }

    const timeRanges = selectedTimeSlots.map((slot) => {
      const [startStr, endStr] = slot.split(" - ");

      const parseTimeStr = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return null;

        let [, hours, minutes, period] = match;
        hours = parseInt(hours);
        minutes = parseInt(minutes);

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

    timeRanges.sort(
      (a, b) => a.startObj.totalMinutes - b.startObj.totalMinutes
    );

    const isContinuous = timeRanges.every((slot, index) => {
      if (index === 0) return true;
      const prevSlot = timeRanges[index - 1];
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

    const firstStart = timeRanges[0].start;
    const lastEnd = timeRanges[timeRanges.length - 1].end;
    const combinedTimeSlot = `${firstStart} - ${lastEnd}`;

    try {
      const timeValues = parseTimeSlot(combinedTimeSlot, date);
      let roomId = null;
      if (booking.originalBooking && booking.originalBooking.room) {
        if (typeof booking.originalBooking.room === "object") {
          roomId = booking.originalBooking.room.id;
        } else {
          roomId = booking.originalBooking.room;
        }
      } else if (booking.roomId) {
        roomId = booking.roomId;
      } else if (booking.room) {
        roomId =
          typeof booking.room === "object" ? booking.room.id : booking.room;
      }

      if (!roomId) {
        throw new Error("Could not identify the room for this booking");
      }

      const bookingUpdate = {
        room: roomId,
        start_time: timeValues.start_time,
        end_time: timeValues.end_time,
        purpose: purpose,
        participants: attendees.toString(),
        notes: notes,
        status: "PENDING",
      };

      const response = await api.patch(
        `/bookings/${booking.id}/`,
        bookingUpdate
      );

      if (response.status === 200) {
        setAlert({
          show: true,
          type: "success",
          message:
            "Booking updated successfully! Your booking will require re-approval.",
        });

        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        setAlert({
          show: true,
          type: "danger",
          message: "Failed to update booking. Please try again.",
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: "danger",
        message:
          error.message || "An error occurred while updating the booking.",
      });
    }
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
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
          <h2 className="text-2xl font-bold mb-2">Modify Booking</h2>
          <p className="text-gray-400">
            Update the date and time for your booking
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-gray-300">
              <Building2 size={20} />
              <div>
                <p className="text-sm text-gray-400">Room</p>
                <p>
                  {booking.roomName || "Room"} - {booking.building}
                </p>
              </div>
            </div>

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
                  <div className="space-y-1 max-h-48 overflow-y-auto">
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
            <div className="flex items-center space-x-3 text-gray-300">
              <Users size={20} />
              <div>
                <p className="text-sm text-gray-400">Capacity</p>
                <p>{booking.capacity} people</p>
              </div>
            </div>

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

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Clock className="mr-2 text-purple-400" size={20} />
            Select Time Slots
            <span className="ml-2 text-sm text-gray-400">
              (Click multiple slots to book consecutive hours)
            </span>
          </h3>

          {loadingTimeSlots ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 size={30} className="animate-spin text-purple-500" />
              <span className="ml-2 text-gray-300">
                Loading available slots...
              </span>
            </div>
          ) : timeSlotError ? (
            <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-center text-red-300">
              {timeSlotError}
            </div>
          ) : availableTimeSlots.length === 0 ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-center text-yellow-300">
              No available time slots for this date
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-plek-purple mr-1.5"></div>
                    <span className="text-sm text-gray-300">Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-gray-600 mr-1.5"></div>
                    <span className="text-sm text-gray-300">
                      Booked by Others
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-orange-500 mr-1.5"></div>
                    <span className="text-sm text-gray-300">
                      Your Other Bookings
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-green-600 mr-1.5"></div>
                    <span className="text-sm text-gray-300">Selected</span>
                  </div>
                </div>
              </div>

              {sameUserBookings.length > 0 && (
                <div className="mb-3 bg-plek-background/50 p-2 rounded text-sm">
                  <div>
                    <p className="text-gray-300 font-medium mb-1">
                      Your other bookings on this date:
                    </p>
                    <ul className="space-y-1 text-gray-400">
                      {sameUserBookings.map((b, index) => {
                        const start = DateTime.fromISO(b.start_time).toFormat(
                          "h:mm a"
                        );
                        const end = DateTime.fromISO(b.end_time).toFormat(
                          "h:mm a"
                        );
                        return (
                          <li key={`same-${index}`}>
                            • {start} - {end}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-8 gap-2 bg-plek-lightgray p-4 rounded-lg">
                {availableTimeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      relative rounded-lg transition-all overflow-hidden
                      ${
                        slot.isCurrentBooking
                          ? (selectedTimeSlots.includes(slot.time)
                              ? "bg-green-600" // Selected current booking
                              : "bg-plek-purple") + " cursor-pointer" // Unselected current booking (changed from gray-500 to plek-purple)
                          : slot.isSameUserBooking
                          ? "bg-orange-500 cursor-not-allowed"
                          : slot.isOtherUserBooking
                          ? "bg-gray-600 cursor-not-allowed"
                          : selectedTimeSlots.includes(slot.time)
                          ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                          : "bg-plek-purple hover:bg-purple-600 cursor-pointer"
                      }
                    `}
                    onClick={() => handleTimeSlotClick(slot)}
                    title={
                      slot.isCurrentBooking
                        ? selectedTimeSlots.includes(slot.time)
                          ? "Your current booking time - click to deselect"
                          : "Your current booking time - click to select again"
                        : slot.isSameUserBooking
                        ? "Your other booking"
                        : slot.isOtherUserBooking
                        ? `Booked by: ${slot.bookedBy || "another user"}`
                        : "Available"
                    }
                  >
                    {/* The yellow corner indicator should show even when deselected */}
                    {slot.isCurrentBooking && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-t-transparent border-r-yellow-500"></div>
                    )}

                    <div className="p-2 text-center h-full flex flex-col justify-center">
                      <p
                        className={`text-xs font-medium ${
                          slot.isOtherUserBooking && !slot.isCurrentBooking
                            ? "text-gray-400"
                            : "text-white"
                        }`}
                      >
                        {slot.time.split(" - ")[0]}
                      </p>
                      <p
                        className={`text-xs ${
                          slot.isOtherUserBooking && !slot.isCurrentBooking
                            ? "text-gray-400"
                            : "text-gray-200"
                        }`}
                      >
                        {slot.time.split(" - ")[1]}
                      </p>
                    </div>

                    {selectedTimeSlots.includes(slot.time) &&
                      !slot.isOtherUserBooking && (
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

                    {slot.isOtherUserBooking && !slot.isCurrentBooking && (
                      <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                        <X size={12} className="text-gray-400" />
                      </div>
                    )}

                    {slot.isSameUserBooking && !slot.isCurrentBooking && (
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

        {booking.amenities && booking.amenities.length > 0 && (
          <div className="bg-plek-lightgray rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-package-check"
              >
                <path d="M16 16h6" />
                <path d="M19 13v6" />
                <path d="M12.5 3l-7.5 4.5v9l7.5 4.5 7.5-4.5v-9L12.5 3z" />
                <path d="M12.5 3v9l7.5 4.5" />
                <path d="M12.5 12L5 7.5" />
              </svg>
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Available Amenities
                </p>
                <div className="flex flex-wrap gap-2">
                  {booking.amenities.map((amenity) => (
                    <span
                      key={amenity.id}
                      className="px-3 py-1 bg-plek-purple/20 border border-purple-700/30 text-gray-200 text-sm flex items-center hover:bg-plek-purple/30 transition-colors shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-sm bg-purple-400 mr-1.5"></span>
                      {amenity.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
              max={booking.capacity}
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
              onClick={() => {
                setAlert({
                  show: true,
                  type: "warning",
                  message: "Are you sure you want to cancel this booking?",
                });
                setTimeout(() => {
                  if (
                    window.confirm(
                      "Are you sure you want to cancel this booking?"
                    )
                  ) {
                    onCancel(booking.id);
                  }
                }, 500);
              }}
              className="flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              <span>Cancel Booking</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-plek-background hover:bg-plek-lightgray rounded-lg transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-plek-purple hover:bg-purple-700 rounded-lg transition-colors"
              disabled={loadingTimeSlots} // Only disable when loading
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

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

export default ModifyBookingModal;

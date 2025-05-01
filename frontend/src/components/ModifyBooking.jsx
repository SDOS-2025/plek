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
  // Pre-process the booking data to ensure capacity is set correctly
  const processedBooking = {
    ...booking,
    // Ensure capacity is properly set from the room data
    capacity: booking.capacity
      ? parseInt(booking.capacity)
      : booking.original &&
        booking.original.room &&
        booking.original.room.capacity
      ? parseInt(booking.original.room.capacity)
      : 100,
  };

  const [purpose, setPurpose] = useState(processedBooking.purpose || "");
  // Use nullish coalescing to keep numeric 0 values
  const [attendees, setAttendees] = useState(
    processedBooking.attendees ?? processedBooking.participants ?? ""
  );
  const [notes, setNotes] = useState(processedBooking.notes || "");

  // Process the booking time slot from UTC to local time
  const getFormattedSlot = () => {
    // Check if we have the raw start/end times in the booking object
    if (processedBooking.start_time && processedBooking.end_time) {
      const startTime = DateTime.fromISO(processedBooking.start_time, {
        zone: "Asia/Kolkata",
      });
      const endTime = DateTime.fromISO(processedBooking.end_time, {
        zone: "Asia/Kolkata",
      });
      return `${startTime.toFormat("h:mm a")} - ${endTime.toFormat("h:mm a")}`;
    }
    // Otherwise, fall back to the slot field if available
    return processedBooking.slot || "";
  };

  // Set the initial time slot using proper timezone conversion
  const formattedTimeSlot = getFormattedSlot();

  const [selectedTimeSlots, setSelectedTimeSlots] = useState(
    formattedTimeSlot ? [formattedTimeSlot] : []
  );
  const [originalTimeSlot, setOriginalTimeSlot] = useState(
    formattedTimeSlot || ""
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
  const [userRole, setUserRole] = useState(null); // State to track the user's role

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

      if (!isInitialLoad && selectedDate !== date) {
        setSelectedTimeSlots([]);
      }

      // Standard list of all possible time slots
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

      // Get current date and time in IST
      const now = DateTime.now().setZone("Asia/Kolkata");
      const isToday = now.toISODate() === selectedDate;

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
      console.log("Room data response:", response.data);

      // Update the room information from the API response
      if (response.data) {
        // Update room capacity
        if (response.data.capacity) {
          booking.capacity = response.data.capacity;
        }

        // Update room name and building information
        if (response.data.name) {
          booking.roomName = response.data.name;
        }

        if (response.data.building_name) {
          booking.building = response.data.building_name;
        }

        console.log("Updated room info:", {
          name: booking.roomName,
          building: booking.building,
          capacity: booking.capacity,
        });
      }

      if (!response.data || !response.data.bookings) {
        throw new Error("Invalid response format from API");
      }

      const bookings = response.data.bookings || [];
      console.log("Retrieved bookings:", bookings);
      console.log("Current booking ID:", booking.id);

      const processedBookings = bookings.map((bookingItem) => {
        return {
          id: bookingItem.id || 0,
          userId: bookingItem.user || null,
          userEmail: bookingItem.user_email || "Unknown user",
          userFirstName: bookingItem.user_first_name || null,
          startTime: DateTime.fromISO(bookingItem.start_time, {
            zone: "Asia/Kolkata",
          }),
          endTime: DateTime.fromISO(bookingItem.end_time, {
            zone: "Asia/Kolkata",
          }),
          status: bookingItem.status || "APPROVED",
          isCurrentBooking: parseInt(bookingItem.id) === parseInt(booking.id),
        };
      });

      const currentBookingData = processedBookings.find(
        (b) => parseInt(b.id) === parseInt(booking.id)
      );

      const currentBookingId = parseInt(booking.id);

      const sameUserBookingsData = bookings.filter((b) => {
        const isCurrentBooking = parseInt(b.id) === currentBookingId;
        const isSameUser = b.user === currentUserId;
        const isRejected = b.status && b.status.toUpperCase() === "REJECTED";

        return isSameUser && !isCurrentBooking && !isRejected;
      });

      const otherUserBookingsData = bookings.filter((b) => {
        const isRejected = b.status && b.status.toUpperCase() === "REJECTED";
        return b.user !== currentUserId && !isRejected;
      });

      setSameUserBookings(sameUserBookingsData);
      setOtherUserBookings(otherUserBookingsData);

      const sameUserRanges = processedBookings.filter((r) => {
        const isRejected = r.status && r.status.toUpperCase() === "REJECTED";
        return (
          r.userId === currentUserId &&
          parseInt(r.id) !== currentBookingId &&
          !isRejected
        );
      });

      const otherUserRanges = processedBookings.filter((r) => {
        const isRejected = r.status && r.status.toUpperCase() === "REJECTED";
        return r.userId !== currentUserId && !isRejected;
      });

      const slotsWithStatus = allTimeSlots.map((timeSlot) => {
        const [startStr, endStr] = timeSlot.split(" - ");
        const slotStartMinutes = timeToMinutes(startStr);
        const slotEndMinutes = timeToMinutes(endStr);

        let isCurrentBooking = false;

        if (currentBookingData) {
          const bookingStartMinutes =
            currentBookingData.startTime.hour * 60 +
            currentBookingData.startTime.minute;
          const bookingEndMinutes =
            currentBookingData.endTime.hour * 60 +
            currentBookingData.endTime.minute;

          isCurrentBooking = !(
            slotEndMinutes <= bookingStartMinutes ||
            slotStartMinutes >= bookingEndMinutes
          );
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

        // Check if time slot is in the past (only for today)
        let isPast = false;
        if (isToday) {
          // Parse start time of the slot to compare with current time
          const parsedTime = parseTimeStr(startStr);
          if (parsedTime) {
            const slotDateTime = now.set({ 
              hour: parsedTime.hours, 
              minute: parsedTime.minutes, 
              second: 0 
            });
            isPast = slotDateTime <= now;
          }
        }

        return {
          time: timeSlot,
          isCurrentBooking,
          isSameUserBooking: overlapsWithSameUser,
          isOtherUserBooking: overlapsWithOthers,
          isPast,
          isBooked:
            (overlapsWithSameUser || overlapsWithOthers) && !isCurrentBooking,
          bookedBy: overlappingBooking ? overlappingBooking.userEmail : null,
          bookingId: overlappingBooking ? overlappingBooking.id : null,
          userId: overlappingBooking ? overlappingBooking.userId : null,
        };
      });

      // Check if all slots for today are either booked, part of another booking, or in the past
      const allSlotsUnavailable = slotsWithStatus.every(
        (slot) => slot.isBooked || slot.isPast || (slot.isCurrentBooking && !selectedTimeSlots.includes(slot.time))
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
            message: "No available slots for today. Showing the next available day.",
          });
          // fetchAvailableTimeSlots will be called again due to the date change effect
          return;
        }
      }

      setAvailableTimeSlots(slotsWithStatus);

      if (currentBookingData) {
        const currentSlots = slotsWithStatus
          .filter((slot) => slot.isCurrentBooking)
          .map((slot) => slot.time);

        if (currentSlots.length > 0) {
          setSelectedTimeSlots(currentSlots);
        }
      }
    } catch (error) {
      setTimeSlotError(`Failed to load available time slots: ${error.message}`);
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Helper function to parse time string like "9:00 AM" into hours and minutes
  const parseTimeStr = (timeStr) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    
    return { hours, minutes };
  };
  
  // Function to find the next available date
  const findNextAvailableDate = (currentDate) => {
    const currentDateTime = DateTime.fromISO(currentDate).setZone("Asia/Kolkata");
    // Return the next day
    return currentDateTime.plus({ days: 1 }).toISODate();
  };

  useEffect(() => {
    if (date) {
      fetchAvailableTimeSlots(date);
    }
  }, [date, booking.id]);

  // Fetch user role to determine if booking edits should be auto-approved
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await api.get("/api/accounts/profile/");
        if (response.status === 200) {
          const profileData = response.data;
          
          // Check if user is admin, superadmin, or coordinator
          const groups = profileData.groups || [];
          const groupNames = groups.map(group => 
            typeof group === 'string' ? group.toLowerCase() : group.name?.toLowerCase()
          );
          
          const isAdmin = profileData.is_superuser || 
            groupNames.includes('superadmin') || 
            groupNames.includes('admin') ||
            groupNames.includes('coordinator');
            
          setUserRole({ 
            isAdmin,
            isCoordinator: groupNames.includes('coordinator'),
            isSuperAdmin: profileData.is_superuser || groupNames.includes('superadmin'),
            groupNames
          });
          
          console.log("User role fetched:", { 
            isAdmin, 
            groups: groupNames,
            isSuperUser: profileData.is_superuser
          });
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    
    fetchUserRole();
  }, []);

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  const handleTimeSlotClick = (slot) => {
    if (
      (slot.isOtherUserBooking || slot.isSameUserBooking) &&
      !slot.isCurrentBooking
    ) {
      return;
    }

    if (selectedTimeSlots.includes(slot.time)) {
      const newSelection = selectedTimeSlots.filter(
        (time) => time !== slot.time
      );
      setSelectedTimeSlots([...newSelection]);
    } else {
      const newSelection = [...selectedTimeSlots, slot.time];
      setSelectedTimeSlots([...newSelection]);
    }
  };

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  const parseTimeSlot = (timeSlot, dateStr) => {
    const [startStr, endStr] = timeSlot.split(" - ");

    // Ensure we're working with the correct date in IST timezone
    const baseDate = DateTime.fromISO(dateStr).setZone("Asia/Kolkata");

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

    // Set hours and minutes using DateTime, maintaining IST timezone
    const startTime = baseDate.set({
      hour: startHours,
      minute: startMinutes,
      second: 0,
      millisecond: 0,
    });

    const endTime = baseDate.set({
      hour: endHours,
      minute: endMinutes,
      second: 0,
      millisecond: 0,
    });

    // Format in ISO 8601 format with timezone information
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

    // Sort time slots and check if they're continuous
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

    // Ensure time slots are sorted in chronological order
    timeRanges.sort(
      (a, b) => a.startObj.totalMinutes - b.startObj.totalMinutes
    );

    // Verify that all selected time slots are continuous
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

    // Create a combined time slot from the first start time to the last end time
    const firstStart = timeRanges[0].start;
    const lastEnd = timeRanges[timeRanges.length - 1].end;
    const combinedTimeSlot = `${firstStart} - ${lastEnd}`;

    try {
      // Convert to ISO format with proper timezone
      const timeValues = parseTimeSlot(combinedTimeSlot, date);

      // Determine the room ID - handle different data structures
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

      // Check if the time slot has changed, which requires re-approval for normal users
      const timeHasChanged = combinedTimeSlot !== originalTimeSlot;
      
      // Check if the user is an admin/coordinator (can auto-approve)
      const isPrivilegedUser = userRole?.isCoordinator || 
                              userRole?.isSuperAdmin || 
                              (userRole?.groupNames || []).includes('admin');
      
      // For coordinators, admins, or superadmins, we keep status as APPROVED
      // For regular users, booking needs re-approval if time changes
      const needsReapproval = timeHasChanged && !isPrivilegedUser;
      
      console.log("Booking modification:", {
        timeHasChanged,
        isPrivilegedUser,
        needsReapproval,
        userRole
      });

      // Get the proper booking ID (ensure it's a number)
      let bookingId = parseInt(booking.id);

      // Log the booking ID and data being sent to help diagnose issues
      console.log("Booking ID being used for update:", bookingId);
      console.log("Booking object:", booking);

      // Prepare the booking update payload
      const bookingUpdate = {
        room: roomId,
        start_time: timeValues.start_time,
        end_time: timeValues.end_time,
        purpose: purpose.trim(),
        participants: attendees.toString(),
        notes: notes,
      };
      
      // Only add status=PENDING if the user is not privileged and time has changed
      if (needsReapproval) {
        bookingUpdate.status = "PENDING";
      } else if (isPrivilegedUser) {
        // Explicitly set to APPROVED for privileged users
        bookingUpdate.status = "APPROVED";
      }

      console.log("Updating booking with data:", bookingUpdate);

      // Send the update request - ensure the bookingId is valid
      if (!bookingId || isNaN(bookingId)) {
        throw new Error("Invalid booking ID");
      }

      // Send the update request
      const response = await api.patch(
        `/bookings/${bookingId}/`,
        bookingUpdate
      );

      if (response.status === 200) {
        setAlert({
          show: true,
          type: "success",
          message: needsReapproval
            ? "Booking updated successfully! Your booking will require re-approval."
            : "Booking details updated successfully!",
        });

        // Close modal after a short delay without page reload
        setTimeout(() => {
          onClose(response.data); // Pass the updated booking data to parent component
        }, 2000);
      } else {
        setAlert({
          show: true,
          type: "danger",
          message: "Failed to update booking. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error updating booking:", error);

      // Extract error message from response if available
      let errorMessage = "An error occurred while updating the booking.";

      if (error.response && error.response.data) {
        // Check for specific validation errors
        if (
          error.response.data.start_time &&
          error.response.data.start_time.includes("Backdated")
        ) {
          errorMessage =
            "Backdated bookings are not allowed. Please select a future time slot.";
        } else if (error.response.data.time) {
          errorMessage = error.response.data.time;
        } else if (error.response.data.room) {
          errorMessage = error.response.data.room;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        }
      }

      setAlert({
        show: true,
        type: "danger",
        message: errorMessage,
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
                              ? "bg-green-600"
                              : "bg-plek-purple") + " cursor-pointer"
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
              placeholder="Enter purpose of booking"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Attendees
            </label>
            <input
              type="number"
              value={attendees}
              onChange={(e) => {
                // Ensure valid number input with max capacity limit
                const value = parseInt(e.target.value);
                const maxCapacity = booking.capacity || 1000;

                if (!isNaN(value) && value >= 0) {
                  setAttendees(Math.min(value, maxCapacity));
                } else if (e.target.value === "") {
                  setAttendees("");
                }
              }}
              min="1"
              max={booking.capacity || 1000}
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
              placeholder="Any special requirements or notes (optional)"
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
              disabled={loadingTimeSlots}
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

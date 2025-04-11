import React, { useState, useEffect } from "react";
import { X, Building2, CalendarDays, CalendarClock, Users, Projector, Wifi, Square, Loader2, Trash2 } from "lucide-react";
import api from "../api";

const ModifyBookingModal = ({ booking, onClose, onCancel }) => {
  // Pre-populate fields from the booking
  const [purpose, setPurpose] = useState(booking.purpose || "Team Meeting");
  const [attendees, setAttendees] = useState(booking.attendees || "6");
  const [notes, setNotes] = useState(booking.notes || "Need whiteboard markers");
  const [date, setDate] = useState(booking.date);
  const [timeSlot, setTimeSlot] = useState(booking.slot);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // States for handling time slot availability
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [timeSlotError, setTimeSlotError] = useState(null);

  // Generate dates for the next 14 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      const formattedDate = date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      dates.push({
        value: date.toISOString().split('T')[0],
        label: formattedDate
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
      
      // Define all possible time slots
      const allTimeSlots = [
        "9:00 AM - 10:00 AM",
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "12:00 PM - 1:00 PM",
        "1:00 PM - 2:00 PM",
        "2:00 PM - 3:00 PM",
        "3:00 PM - 4:00 PM",
        "4:00 PM - 5:00 PM"
      ];
      
      // API call to get available time slots for this room on the selected date
      // Exclude current booking from availability check
      const response = await api.get(`/rooms/${booking.room_id}/availability?date=${selectedDate}&exclude=${booking.id}`);
      
      // Get the available slots from API response
      const availableFromApi = response.data.availableSlots || [];
      
      // Always include the current booking's time slot as available
      if (!availableFromApi.includes(booking.slot)) {
        availableFromApi.push(booking.slot);
      }
      
      // Create array with both available and booked slots
      const slotsWithStatus = allTimeSlots.map(time => ({
        time,
        isBooked: !availableFromApi.includes(time) && time !== booking.slot
      }));
      
      setAvailableTimeSlots(slotsWithStatus);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      // setTimeSlotError("Failed to load available time slots");
      
      // Fallback to ensure current slot is available
      const defaultSlots = [
        "9:00 AM - 10:00 AM",
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "12:00 PM - 1:00 PM",
        "1:00 PM - 2:00 PM",
        "2:00 PM - 3:00 PM",
        "3:00 PM - 4:00 PM",
        "4:00 PM - 5:00 PM"
      ].map(time => ({ time, isBooked: false }));
      setAvailableTimeSlots(defaultSlots);
      setTimeSlotError("Failed to load available time slots");
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Fetch available slots when date changes
  useEffect(() => {
    fetchAvailableTimeSlots(date);
  }, [date, booking.id]);

  // Handle opening dropdowns and closing others
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker) setShowTimePicker(false);
  };

  const toggleTimePicker = () => {
    setShowTimePicker(!showTimePicker);
    if (!showTimePicker) setShowDatePicker(false);
  };

  // Handle date selection
  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  // Parse time slot to ISO format for API
  const parseTimeSlot = (timeSlot, dateStr) => {
    const [startStr, endStr] = timeSlot.split(' - ');
    
    // Create date objects for start and end times
    const date = new Date(dateStr);
    const startDate = new Date(date);
    const endDate = new Date(date);
    
    // Parse hours and minutes from the time strings
    const [startHours, startMinutes] = startStr.match(/(\d+):(\d+)/).slice(1, 3).map(Number);
    const [endHours, endMinutes] = endStr.match(/(\d+):(\d+)/).slice(1, 3).map(Number);
    
    // Adjust for PM times
    const startPeriod = startStr.includes('PM');
    const endPeriod = endStr.includes('PM');
    
    let startHour = startHours;
    if (startPeriod && startHours !== 12) startHour += 12;
    if (!startPeriod && startHours === 12) startHour = 0;
    
    let endHour = endHours;
    if (endPeriod && endHours !== 12) endHour += 12;
    if (!endPeriod && endHours === 12) endHour = 0;
    
    // Set hours and minutes
    startDate.setHours(startHour, startMinutes, 0, 0);
    endDate.setHours(endHour, endMinutes, 0, 0);
    
    return {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get time values from the selected time slot
      const timeValues = parseTimeSlot(timeSlot, date);
      
      // Create booking update object
      const bookingUpdate = {
        start_time: timeValues.start_time,
        end_time: timeValues.end_time,
        purpose: purpose,
        participants: attendees.toString(),
        notes: notes,
      };
      
      console.log("Updating booking:", bookingUpdate);
      const response = await api.put(`/book/update/${booking.id}/`, bookingUpdate);
      
      if (response.status === 200) {
        alert("Booking updated successfully!");
        onClose();
        // Refresh the bookings list
        window.location.reload();
      } else {
        console.error("Update failed:", response.data);
        alert("Failed to update booking. Please try again.");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("An error occurred while updating the booking.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
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
            {/* Room information - READ ONLY */}
            <div className="flex items-center space-x-3 text-gray-300">
              <Building2 size={20} />
              <div>
                <p className="text-sm text-gray-400">Room</p>
                <p>
                  {booking.room} - {booking.building}
                </p>
              </div>
            </div>
            
            {/* Date picker */}
            <div className="bg-gray-750 rounded-lg relative">
              {/* Date picker trigger */}
              <div
                className="flex items-center justify-between text-gray-300 cursor-pointer p-2 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors"
                onClick={toggleDatePicker}
              >
                <div className="flex items-center space-x-3">
                  <CalendarDays size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p>{availableDates.find(d => d.value === date)?.label || date}</p>
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
                  className={`transition-transform ${showDatePicker ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-lg p-3 z-10 w-full border border-gray-600">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {availableDates.map((d, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                          d.value === date 
                            ? "bg-purple-600 text-white" 
                            : "hover:bg-gray-600 active:bg-gray-500"
                        }`}
                        onClick={() => handleDateSelect(d.value)}
                      >
                        <span>{d.label}</span>
                        {d.value === date ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100">
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
            <div className="bg-gray-750 rounded-lg relative">
              {/* Time slot picker trigger */}
              <div
                className={`flex items-center justify-between text-gray-300 cursor-pointer p-2 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors ${loadingTimeSlots ? 'opacity-75' : ''}`}
                onClick={toggleTimePicker}
              >
                <div className="flex items-center space-x-3">
                  <CalendarClock size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Time Slot</p>
                    <p>{loadingTimeSlots ? "Loading..." : timeSlot || "Select a time"}</p>
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
                    className={`transition-transform ${showTimePicker ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                )}
              </div>
              {showTimePicker && !loadingTimeSlots && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-lg p-3 z-10 w-full border border-gray-600">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
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
                              ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                              : slot.time === timeSlot
                                ? "bg-purple-600 text-white cursor-pointer" 
                                : "hover:bg-gray-600 active:bg-gray-500 cursor-pointer"
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
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-gray-500">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                            )}
                            <span>{slot.time}</span>
                          </div>
                          {!slot.isBooked && slot.time === timeSlot && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            
            {/* Capacity information - READ ONLY */}
            <div className="flex items-center space-x-3 text-gray-300">
              <Users size={20} />
              <div>
                <p className="text-sm text-gray-400">Capacity</p>
                <p>{booking.capacity} people</p>
              </div>
            </div>
          </div>
        </div>

        {/* Amenities section */}
        {booking.amenities && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Available Amenities</h3>
            <div className="flex space-x-4">
              {booking.amenities.includes("projector") && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Projector size={18} />
                  <span>Projector</span>
                </div>
              )}
              {booking.amenities.includes("wifi") && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Wifi size={18} />
                  <span>Wi-Fi</span>
                </div>
              )}
              {booking.amenities.includes("whiteboard") && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Square size={18} />
                  <span>Whiteboard</span>
                </div>
              )}
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
              className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 h-32"
              placeholder="Any special requirements or notes"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to cancel this booking?")) {
                  onCancel(booking.id);
                }
              }}
              className="flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              <span>Cancel Booking</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              disabled={!timeSlot || loadingTimeSlots}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifyBookingModal;

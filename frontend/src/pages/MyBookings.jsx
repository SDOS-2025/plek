import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  CalendarClock,
  Users,
  Projector,
  Wifi,
  X,
  Trash2,
  Loader2
} from "lucide-react";
import api from "../api";
// Import the ModifyBookingModal component
import ModifyBookingModal from "../components/ModifyBooking";
import NavBar from "../components/NavBar";

function MyBookings() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [previousBookings, setPreviousBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const firstName = localStorage.getItem("FirstName");

  // Fetch bookings when component mounts
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        
        // Make API call to get user's bookings
        const response = await api.get("bookings/?all=false");
        
        // Process the response data
        const bookings = response.data;
        const now = new Date();
        
        // Split bookings into upcoming and previous
        const upcoming = [];
        const previous = [];
        
        bookings.forEach(booking => {
          // Use start_time instead of just date for more accurate comparison
          const bookingDateTime = new Date(booking.start_time || booking.date);
          
          // Format the date for display - extract from start_time if available
          const bookingDate = new Date(booking.start_time || booking.date);
          const formattedDate = bookingDate.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          
          // Format the time from start_time and end_time
          let timeSlot = booking.time_slot;
          if (!timeSlot && booking.start_time && booking.end_time) {
            const startTime = new Date(booking.start_time);
            const endTime = new Date(booking.end_time);
            
            const formatTime = (date) => {
              return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            };
            
            timeSlot = `${formatTime(startTime)} - ${formatTime(endTime)}`;
          }
          
          // Create a formatted booking object
          const formattedBooking = {
            id: booking.id,
            room: booking.room.name,
            building: booking.room.building,
            slot: timeSlot || "Time not specified",
            date: formattedDate,
            capacity: booking.room.capacity,
            status: booking.status || "Pending",
            purpose: booking.purpose,
            attendees: booking.attendees,
            notes: booking.notes,
            // Store raw datetime for sorting
            rawDateTime: bookingDateTime
          };
          
          // Add to appropriate array based on date/time and not status
          if (bookingDateTime > now) {
            upcoming.push(formattedBooking);
          } else {
            previous.push(formattedBooking);
          }
        });
        
        // Sort upcoming bookings by date (nearest first)
        upcoming.sort((a, b) => a.rawDateTime - b.rawDateTime);
        
        // Sort previous bookings by date (most recent first)
        previous.sort((a, b) => b.rawDateTime - a.rawDateTime);
        
        // Update state with the fetched bookings
        setUpcomingBookings(upcoming);
        setPreviousBookings(previous);
        setError(null);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError("Failed to load your bookings. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, []);

  const handleModify = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleCancel = async (bookingId) => {
    try {
      // Call the API to cancel/delete the booking
      await api.delete(`book/delete/${bookingId}/`);
      
      // Remove the canceled booking from the state
      setUpcomingBookings(upcomingBookings.filter(booking => booking.id !== bookingId));
      
      alert("Booking canceled successfully");
    } catch (err) {
      console.error("Error canceling booking:", err);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-plek-background text-gray-100">
      {/* Navigation */}
      <NavBar activePage="my-bookings" />

      {/* Main Content */}
      <div className="min-w-[99vw] mx-auto px-4 py-10 flex-grow">
        {/* Tab Navigation and Content */}
        <div className="bg-black p-6 rounded-lg mb-14">
          <div className="flex space-x-4 mb-6">
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "upcoming"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming Bookings
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "previous"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("previous")}
            >
              Previous Bookings
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[75vh] overflow-y-auto custom-scrollbar rounded-lg p-2 max-w-full w-full mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
                <p className="text-gray-400">Loading your bookings...</p>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                <p>{error}</p>
              </div>
            ) : activeTab === "upcoming" ? (
              upcomingBookings.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>You don't have any upcoming bookings.</p>
                  <Link to="/booking" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">
                    Book a room now
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-plek-dark rounded-lg p-6 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium mb-2">
                            Room: {booking.room}
                          </h3>
                          <p className="text-gray-400">
                            Building: {booking.building}
                          </p>
                          <div className="mt-4 space-y-2">
                            {/* Updated date and time display */}
                            <div className="flex items-center space-x-2 text-gray-300">
                              <CalendarDays size={16} />
                              <span>{booking.date}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-300">
                              <CalendarClock size={16} />
                              <span>{booking.slot}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-300">
                              <Users size={16} />
                              <span>Capacity: {booking.capacity}</span>
                            </div>
                            <p
                              className={`flex items-center space-x-2 ${
                                booking.status.toLowerCase() === "approved"
                                  ? "text-green-400"
                                  : booking.status.toLowerCase() === "pending"
                                  ? "text-yellow-400"
                                  : "text-red-400"
                              }`}
                            >
                              <span>Status: {booking.status}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleModify(booking)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                          >
                            Modify
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              previousBookings.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>No previous bookings found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previousBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-plek-dark rounded-lg p-6 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium mb-2">
                            Room: {booking.room}
                          </h3>
                          <p className="text-gray-400">
                            Building: {booking.building}
                          </p>
                          <div className="mt-4 space-y-2">
                            {/* Updated date and time display */}
                            <div className="flex items-center space-x-2 text-gray-300">
                              <CalendarDays size={16} />
                              <span>{booking.date}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-300">
                              <CalendarClock size={16} />
                              <span>{booking.slot}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-300">
                              <Users size={16} />
                              <span>Capacity: {booking.capacity}</span>
                            </div>
                            <p
                              className={`flex items-center space-x-2 ${
                                booking.status.toLowerCase() === "completed"
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              <span>Status: {booking.status}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-plek-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link to="/about" className="hover:text-white transition-colors">
              About us
            </Link>
            <Link to="/help" className="hover:text-white transition-colors">
              Help Center
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </footer>

      {/* Modify Booking Modal - replaced with imported component */}
      {showModifyModal && selectedBooking && (
        <ModifyBookingModal
          booking={selectedBooking}
          onClose={() => setShowModifyModal(false)}
          onCancel={(id) => {
            handleCancel(id);
            setShowModifyModal(false);
          }}
        />
      )}
    </div>
  );
}

export default MyBookings;

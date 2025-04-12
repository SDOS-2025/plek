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
import { DateTime } from "luxon";
import Footer from "../components/Footer";

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
        const now = DateTime.now().setZone("Asia/Kolkata").toJSDate();
        
        // Split bookings into upcoming and previous
        const upcoming = [];
        const previous = [];
        
        bookings.forEach(booking => {
          const bookingDate = DateTime.fromFormat(
            `${booking.date} ${booking.slot.split(" - ")[0]}`, 
            "d MMMM yyyy h a", 
            { zone: "Asia/Kolkata" }
          ).toJSDate();
          
          if (bookingDate > now) {
            upcoming.push(booking);
          } else {
            previous.push(booking);
          }
        });
        
        // Sort upcoming bookings by date (closest first)
        upcoming.sort((a, b) => {
          const dateA = DateTime.fromFormat(
            `${a.date} ${a.slot.split(" - ")[0]}`, 
            "d MMMM yyyy h a", 
            { zone: "Asia/Kolkata" }
          );
          
          const dateB = DateTime.fromFormat(
            `${b.date} ${b.slot.split(" - ")[0]}`, 
            "d MMMM yyyy h a", 
            { zone: "Asia/Kolkata" }
          );
          
          return dateA - dateB;
        });
        
        // Sort previous bookings by date (most recent first)
        previous.sort((a, b) => {
          const dateA = DateTime.fromFormat(
            `${a.date} ${a.slot.split(" - ")[0]}`, 
            "d MMMM yyyy h a", 
            { zone: "Asia/Kolkata" }
          );
          
          const dateB = DateTime.fromFormat(
            `${b.date} ${b.slot.split(" - ")[0]}`, 
            "d MMMM yyyy h a", 
            { zone: "Asia/Kolkata" }
          );
          
          return dateB - dateA;
        });
        
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
      await api.delete(`bookings/delete/${bookingId}/`);
      
      // Update the state to remove the canceled booking
      setUpcomingBookings(upcomingBookings.filter(booking => booking.id !== bookingId));
      
      alert("Booking canceled successfully");
    } catch (err) {
      console.error("Error canceling booking:", err);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  return (
    <div className="page-container">
      {/* Navigation */}
      <NavBar activePage="my-bookings" />

      {/* Main Content */}
      <div className="main-content">
        {/* Tab Navigation and Content */}
        <div className="card-container">
          <div className="tab-container">
            <div className="flex space-x-4">
              <button
                className={`px-6 py-2 rounded-lg transition-colors ${
                  activeTab === "upcoming"
                    ? "bg-plek-purple text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming Bookings
              </button>
              <button
                className={`px-6 py-2 rounded-lg transition-colors ${
                  activeTab === "previous"
                    ? "bg-plek-purple text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setActiveTab("previous")}
              >
                Previous Bookings
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="scrollable-area">
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
                      className="section-card"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium mb-2">
                            Room: {booking.roomName}
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
                      className="section-card"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium mb-2">
                            Room: {booking.name}
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
      <Footer />

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

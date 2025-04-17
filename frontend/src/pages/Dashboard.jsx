import React, { useState, useContext, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Activity,
  BookMarked,
  Projector,
  Wifi,
  X,
  Building2,
  CalendarDays,
  CalendarClock,
  Trash2,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BookingModal from "../components/ConfirmBooking";
import ModifyBookingModal from "../components/ModifyBooking";
import api from "../api";
import { AuthContext } from "../context/AuthProvider";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { DateTime } from "luxon";

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const firstName =
    user?.firstName || localStorage.getItem("firstName") || "User";
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const navigate = useNavigate();

  // New state variables for bookings management
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);

  // Fetch bookings when component mounts
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoadingBookings(true);

        // Make API call to get user's bookings
        const response = await api.get("/bookings/?all=false");

        // Process the response data
        const bookings = response.data;
        const now = DateTime.now().setZone("Asia/Kolkata").toJSDate();

        // Process upcoming bookings
        const upcoming = [];

        bookings.forEach((booking) => {
          // Parse the start_time from the API response
          const startTime = DateTime.fromISO(booking.start_time, {
            zone: "Asia/Kolkata",
          });
          const endTime = DateTime.fromISO(booking.end_time, {
            zone: "Asia/Kolkata",
          });

          // Format date and time for display
          const formattedDate = startTime.toFormat("LLLL d, yyyy");
          const formattedTimeSlot = `${startTime.toFormat(
            "h a"
          )} - ${endTime.toFormat("h a")}`;

          // Create a processed booking object with the required fields
          const processedBooking = {
            id: booking.id,
            roomName: booking.room.name,
            room: booking.room.name,
            building: booking.room.building_name,
            capacity: booking.room.capacity,
            status: booking.status,
            purpose: booking.purpose,
            participants: booking.participants,
            date: formattedDate,
            slot: formattedTimeSlot,
            startTime: startTime,
            endTime: endTime,
            amenities: booking.room.amenities,
            // Add any other fields you need from the original booking
            originalBooking: booking, // Keep the original data for reference if needed
          };

          if (startTime.toJSDate() > now) {
            upcoming.push(processedBooking);
          }
        });

        // Sort upcoming bookings by date (closest first)
        upcoming.sort((a, b) => a.startTime - b.startTime);

        // Limit to 3 bookings for the dashboard
        setUpcomingBookings(upcoming.slice(0, 3));
        setBookingsError(null);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setBookingsError("Failed to load your bookings");
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, []);

  const favoriteRooms = [
    {
      room: "B512",
      building: "Research and Development Building",
      capacity: 8,
    },
    {
      room: "A204",
      building: "Research and Development Building",
      capacity: 8,
    },
  ];

  const handleBookClick = (room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleCancel = async (bookingId) => {
    try {
      await api.delete(`/bookings/${bookingId}/`);

      // Update local state to remove this booking
      setUpcomingBookings(upcomingBookings.filter((b) => b.id !== bookingId));
      setMyBookings(myBookings.filter((b) => b.id !== bookingId));

      alert("Booking canceled successfully");
    } catch (err) {
      console.error("Error canceling booking:", err);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  return (
    <div className="page-container">
      {/* Navigation Bar */}
      <NavBar activePage="dashboard" />

      {/* Main Content */}
      <div className="main-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="section-card">
            <h2 className="card-header">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-md">
                <p className="text-sm text-gray-300">
                  You booked Room 102 for Feb 7, 3:00 PM
                </p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-md">
                <p className="text-sm text-gray-300">
                  Your booking request was approved by the coordinator
                </p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-md">
                <p className="text-sm text-gray-300">
                  Admin modified your room reservation
                </p>
              </div>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="lg:col-span-2">
            <div className="section-card mb-8">
              <h2 className="card-header">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                Upcoming Bookings
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {loadingBookings ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2
                      size={40}
                      className="animate-spin text-purple-500 mb-4"
                    />
                    <p className="text-gray-400">Loading your bookings...</p>
                  </div>
                ) : bookingsError ? (
                  <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                    <p>{bookingsError}</p>
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p>You don't have any upcoming bookings.</p>
                    <Link
                      to="/booking"
                      className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
                    >
                      Book a room now
                    </Link>
                  </div>
                ) : (
                  upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-gray-700/50 p-4 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <h3 className="text-md font-medium mr-2">
                              {booking.roomName}
                            </h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                booking.status.toLowerCase() === "approved"
                                  ? "bg-green-900/30 text-green-400"
                                  : booking.status.toLowerCase() === "pending"
                                  ? "bg-yellow-900/30 text-yellow-400"
                                  : "bg-red-900/30 text-red-400"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {booking.building}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300">
                            <div className="flex items-center">
                              <CalendarDays size={12} className="mr-1" />
                              <span>{booking.date}</span>
                            </div>
                            <div className="flex items-center">
                              <CalendarClock size={12} className="mr-1" />
                              <span>{booking.slot}</span>
                            </div>
                            <div className="flex items-center">
                              <Users size={12} className="mr-1" />
                              <span>
                                {booking.participants || 0} / {booking.capacity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="p-1 hover:bg-gray-600 rounded transition-colors"
                            title="Cancel booking"
                          >
                            <Trash2
                              size={18}
                              className="text-gray-400 hover:text-red-400"
                            />
                          </button>
                          <button
                            onClick={() => handleModifyClick(booking)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded transition-colors"
                          >
                            Modify
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Favourite Rooms */}
            <div className="section-card">
              <h2 className="card-header">
                <BookMarked className="h-5 w-5 mr-2 text-purple-500" />
                Favourite Rooms
              </h2>
              <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {favoriteRooms.map((room, index) => (
                  <div key={index} className="bg-gray-700/50 p-6 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">
                          Room: {room.room}
                        </h3>
                        <p className="text-gray-400 mt-1">{room.building}</p>
                        <div className="mt-3 flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-300">
                            Capacity: {room.capacity}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookClick(room)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && (
        <BookingModal
          room={selectedRoom}
          onClose={() => setShowBookingModal(false)}
        />
      )}

      {/* Modify Booking Modal */}
      {showModifyModal && selectedBooking && (
        <ModifyBookingModal
          booking={selectedBooking}
          onClose={() => setShowModifyModal(false)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default Dashboard;

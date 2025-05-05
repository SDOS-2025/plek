import React, { useState, useContext, useEffect } from "react";
import { DateTime } from "luxon";
import { Calendar, Clock, Users, BookMarked, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BookingModal from "../../components/ConfirmBooking";
import ModifyBookingModal from "../../components/ModifyBooking";
import api from "../../api";
import { AuthContext } from "../../context/AuthProvider";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const firstName =
    user?.firstName || localStorage.getItem("FirstName") || "User";
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [frequentRooms, setFrequentRooms] = useState([]);
  const [loading, setLoading] = useState({
    bookings: true,
    frequentRooms: true,
  });
  const [error, setError] = useState({
    bookings: null,
    frequentRooms: null,
  });
  const navigate = useNavigate();

  // Fetch the user's upcoming bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // Fetch bookings from API
        const response = await api.get("bookings/?all=false");
        const bookings = response.data;
        const now = DateTime.now().toJSDate();

        // Process and filter for upcoming bookings only
        const processed = [];

        for (const booking of bookings) {
          // Only process approved bookings that are upcoming
          if (booking.status.toLowerCase() !== "approved") continue;

          const startTime = DateTime.fromISO(booking.start_time);
          const endTime = DateTime.fromISO(booking.end_time);

          // Skip if booking is in the past
          if (startTime.toJSDate() <= now) continue;

          // Format date and time for display
          const formattedDate = startTime.toFormat("LLLL d, yyyy");
          const formattedTimeSlot = `${startTime.toFormat(
            "h a"
          )} - ${endTime.toFormat("h a")}`;

          // Extract room data
          let roomName = "Unknown Room";
          let buildingName = "Unknown Building";
          let roomCapacity = 0;

          if (booking.room) {
            if (typeof booking.room === "object") {
              roomName = booking.room.name || "Unknown Room";
              buildingName = booking.room.building_name || "Unknown Building";
              roomCapacity = booking.room.capacity || 0;
            } else {
              try {
                const roomId =
                  typeof booking.room === "string"
                    ? parseInt(booking.room)
                    : booking.room;
                const roomResponse = await api.get(`/rooms/${roomId}/`);

                if (roomResponse.data) {
                  roomName = roomResponse.data.name || "Unknown Room";
                  buildingName =
                    roomResponse.data.building_name || "Unknown Building";
                  roomCapacity = roomResponse.data.capacity || 0;
                }
              } catch (err) {
                console.error(
                  `Failed to fetch room details for room ID: ${booking.room}`,
                  err
                );
              }
            }
          }

          processed.push({
            id: booking.id,
            room: roomName,
            building: buildingName,
            capacity: roomCapacity,
            date: formattedDate,
            slot: formattedTimeSlot,
            startTime,
            endTime,
            purpose: booking.purpose,
            participants: booking.participants,
            originalBooking: booking, // Keep the original data for reference
          });
        }

        // Sort by date (closest first)
        processed.sort((a, b) => a.startTime - b.startTime);

        // Take only the next 3 upcoming bookings
        setUpcomingBookings(processed.slice(0, 3));
        setError((prev) => ({ ...prev, bookings: null }));
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError((prev) => ({
          ...prev,
          bookings: "Failed to load your bookings",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, bookings: false }));
      }
    };

    fetchBookings();
  }, []);

  // Fetch frequently booked rooms
  useEffect(() => {
    const fetchFrequentRooms = async () => {
      try {
        // Get all of the user's bookings first
        const bookingsResponse = await api.get("bookings/?all=true");
        const allBookings = bookingsResponse.data || [];

        // Count frequency of each room
        const roomFrequency = {};
        const roomDetails = {};

        // Process each booking to count room frequency
        for (const booking of allBookings) {
          // Skip rejected or cancelled bookings
          if (
            ["rejected", "cancelled"].includes(booking.status.toLowerCase())
          ) {
            continue;
          }

          const roomId =
            typeof booking.room === "object" ? booking.room.id : booking.room;

          if (roomId) {
            // Increment count for this room
            roomFrequency[roomId] = (roomFrequency[roomId] || 0) + 1;

            // Store room details if available
            if (typeof booking.room === "object") {
              roomDetails[roomId] = {
                id: booking.room.id,
                room: booking.room.name || "Unknown Room",
                building: booking.room.building_name || "Unknown Building",
                capacity: booking.room.capacity || 0,
                originalRoom: booking.room,
              };
            }
          }
        }

        // For rooms where we only have IDs, fetch the details
        const roomsToFetch = Object.keys(roomFrequency).filter(
          (id) => !roomDetails[id]
        );

        // If we need to fetch any room details
        for (const roomId of roomsToFetch) {
          try {
            const roomResponse = await api.get(`/rooms/${roomId}/`);
            if (roomResponse.data) {
              roomDetails[roomId] = {
                id: roomId,
                room: roomResponse.data.name || "Unknown Room",
                building: roomResponse.data.building_name || "Unknown Building",
                capacity: roomResponse.data.capacity || 0,
                originalRoom: roomResponse.data,
              };
            }
          } catch (err) {
            console.error(
              `Failed to fetch details for room ID: ${roomId}`,
              err
            );
          }
        }

        // Create array of rooms with frequency
        const frequentRoomsList = Object.keys(roomFrequency)
          .map((roomId) => ({
            ...roomDetails[roomId],
            frequency: roomFrequency[roomId],
          }))
          .filter((room) => room.room) // Only include rooms where we have details
          .sort((a, b) => b.frequency - a.frequency) // Sort by frequency (highest first)
          .slice(0, 3); // Take top 3

        setFrequentRooms(frequentRoomsList);
        setError((prev) => ({ ...prev, frequentRooms: null }));
      } catch (err) {
        console.error("Error fetching frequent rooms:", err);
        setError((prev) => ({
          ...prev,
          frequentRooms: "Failed to load frequently booked rooms",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, frequentRooms: false }));
      }
    };

    fetchFrequentRooms();
  }, []);

  const handleBookClick = (room) => {
    setSelectedRoom(room.originalRoom);
    setShowBookingModal(true);
  };

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  return (
    <div className="page-container">
      {/* Navigation Bar */}
      <NavBar activePage="dashboard" />

      {/* Main Content */}
      <div className="flex-grow bg-plek-background px-4 py-6 md:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="section-card bg-gradient-to-r from-plek-dark to-plek-lightgray border-l-4 border-plek-purple mb-8 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Welcome, {firstName}</h1>
              <p className="text-sm md:text-base text-gray-300">
                Here are your upcoming bookings and frequently booked rooms.
              </p>
            </div>
            <Link 
              to="/booking" 
              className="mt-4 md:mt-0 btn btn-primary"
            >
              Book Now
            </Link>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="max-w-6xl mx-auto">
          <div className="grid-layout-2 gap-8">
            {/* Upcoming Bookings */}
            <div className="card-container p-6">
              <h2 className="card-header text-white border-b border-gray-700 pb-4">
                <Calendar className="h-5 w-5 mr-3 text-plek-purple" />
                Upcoming Bookings
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-6">
                {loading.bookings ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2
                      size={30}
                      className="animate-spin text-plek-purple mr-2"
                    />
                    <span className="text-gray-300">Loading your bookings...</span>
                  </div>
                ) : error.bookings ? (
                  <div className="bg-plek-error/20 border border-plek-error text-red-300 p-4 rounded-lg text-center">
                    <p>{error.bookings}</p>
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="text-center py-10 bg-plek-lightgray/30 rounded-lg">
                    <p className="text-gray-400 mb-3">You don't have any upcoming bookings.</p>
                    <Link
                      to="/booking"
                      className="text-plek-purple hover:text-purple-300 underline"
                    >
                      Book a room now
                    </Link>
                  </div>
                ) : (
                  upcomingBookings.map((booking, index) => (
                    <div
                      key={booking.id || index}
                      className="bg-plek-lightgray/30 p-5 rounded-lg hover:bg-plek-hover transition-colors shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                          <h3 className="text-lg font-medium text-white">
                            {booking.room}
                          </h3>
                          <p className="text-gray-400 mt-1 text-sm">{booking.building}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex items-center bg-plek-dark px-3 py-1 rounded-full">
                              <Clock className="h-4 w-4 text-plek-purple mr-1.5" />
                              <span className="text-sm text-gray-300">
                                {booking.slot}
                              </span>
                            </div>
                            <div className="flex items-center bg-plek-dark px-3 py-1 rounded-full">
                              <Calendar className="h-4 w-4 text-plek-purple mr-1.5" />
                              <span className="text-sm text-gray-300">
                                {booking.date}
                              </span>
                            </div>
                            <div className="flex items-center bg-plek-dark px-3 py-1 rounded-full">
                              <Users className="h-4 w-4 text-plek-purple mr-1.5" />
                              <span className="text-sm text-gray-300">
                                {booking.capacity}
                              </span>
                            </div>
                          </div>
                          {booking.purpose && (
                            <p className="mt-3 text-sm text-gray-400">
                              <span className="font-medium text-gray-300">Purpose:</span> {booking.purpose}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleModifyClick(booking)}
                          className="btn btn-primary"
                        >
                          Modify
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-700">
                <Link
                  to="/my-bookings"
                  className="btn btn-secondary"
                >
                  View All Bookings
                </Link>
              </div>
            </div>

            {/* Frequently Booked Rooms */}
            <div className="card-container p-6">
              <h2 className="card-header text-white border-b border-gray-700 pb-4">
                <BookMarked className="h-5 w-5 mr-3 text-plek-purple" />
                Frequently Booked Rooms
              </h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-6">
                {loading.frequentRooms ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2
                      size={30}
                      className="animate-spin text-plek-purple mr-2"
                    />
                    <span className="text-gray-300">Loading frequently booked rooms...</span>
                  </div>
                ) : error.frequentRooms ? (
                  <div className="bg-plek-error/20 border border-plek-error text-red-300 p-4 rounded-lg text-center">
                    <p>{error.frequentRooms}</p>
                  </div>
                ) : frequentRooms.length === 0 ? (
                  <div className="text-center py-10 bg-plek-lightgray/30 rounded-lg">
                    <p className="text-gray-400">No room booking history found.</p>
                  </div>
                ) : (
                  frequentRooms.map((room, index) => (
                    <div
                      key={room.id || index}
                      className="bg-plek-lightgray/30 p-5 rounded-lg hover:bg-plek-hover transition-colors shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                          <h3 className="text-lg font-medium text-white">
                            {room.room}
                          </h3>
                          <p className="text-gray-400 mt-1 text-sm">{room.building}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <div className="flex items-center bg-plek-dark px-3 py-1 rounded-full">
                              <Users className="h-4 w-4 text-plek-purple mr-1.5" />
                              <span className="text-sm text-gray-300">
                                Capacity: {room.capacity}
                              </span>
                            </div>
                            <div className="flex items-center bg-plek-dark px-3 py-1 rounded-full">
                              <BookMarked className="h-4 w-4 text-plek-purple mr-1.5" />
                              <span className="text-sm text-gray-300">
                                Booked {room.frequency} times
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBookClick(room)}
                          className="btn btn-primary"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-center mt-6 pt-4 border-t border-gray-700">
                <Link
                  to="/booking"
                  className="btn btn-primary"
                >
                  Book a New Room
                </Link>
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
          booking={selectedBooking.originalBooking}
          onClose={() => setShowModifyModal(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;

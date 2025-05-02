import React, { useState, useContext, useEffect } from "react";
import { DateTime } from "luxon";
import {
  Calendar,
  Clock,
  Users,
  Activity,
  BookMarked,
  Building2,
  Loader2,
} from "lucide-react";
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
          if (booking.status.toLowerCase() !== 'approved') continue;
          
          const startTime = DateTime.fromISO(booking.start_time);
          const endTime = DateTime.fromISO(booking.end_time);
          
          // Skip if booking is in the past
          if (startTime.toJSDate() <= now) continue;
          
          // Format date and time for display
          const formattedDate = startTime.toFormat("LLLL d, yyyy");
          const formattedTimeSlot = `${startTime.toFormat("h a")} - ${endTime.toFormat("h a")}`;
          
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
                const roomId = typeof booking.room === "string" ? parseInt(booking.room) : booking.room;
                const roomResponse = await api.get(`/rooms/${roomId}/`);
                
                if (roomResponse.data) {
                  roomName = roomResponse.data.name || "Unknown Room";
                  buildingName = roomResponse.data.building_name || "Unknown Building";
                  roomCapacity = roomResponse.data.capacity || 0;
                }
              } catch (err) {
                console.error(`Failed to fetch room details for room ID: ${booking.room}`, err);
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
            originalBooking: booking // Keep the original data for reference
          });
        }
        
        // Sort by date (closest first)
        processed.sort((a, b) => a.startTime - b.startTime);
        
        // Take only the next 3 upcoming bookings
        setUpcomingBookings(processed.slice(0, 3));
        setError(prev => ({...prev, bookings: null}));
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(prev => ({...prev, bookings: "Failed to load your bookings"}));
      } finally {
        setLoading(prev => ({...prev, bookings: false}));
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
          if (['rejected', 'cancelled'].includes(booking.status.toLowerCase())) {
            continue;
          }
          
          const roomId = typeof booking.room === 'object' ? booking.room.id : booking.room;
          
          if (roomId) {
            // Increment count for this room
            roomFrequency[roomId] = (roomFrequency[roomId] || 0) + 1;
            
            // Store room details if available
            if (typeof booking.room === 'object') {
              roomDetails[roomId] = {
                id: booking.room.id,
                room: booking.room.name || 'Unknown Room',
                building: booking.room.building_name || 'Unknown Building',
                capacity: booking.room.capacity || 0,
                originalRoom: booking.room
              };
            }
          }
        }
        
        // For rooms where we only have IDs, fetch the details
        const roomsToFetch = Object.keys(roomFrequency).filter(
          id => !roomDetails[id]
        );
        
        // If we need to fetch any room details
        for (const roomId of roomsToFetch) {
          try {
            const roomResponse = await api.get(`/rooms/${roomId}/`);
            if (roomResponse.data) {
              roomDetails[roomId] = {
                id: roomId,
                room: roomResponse.data.name || 'Unknown Room',
                building: roomResponse.data.building_name || 'Unknown Building',
                capacity: roomResponse.data.capacity || 0,
                originalRoom: roomResponse.data
              };
            }
          } catch (err) {
            console.error(`Failed to fetch details for room ID: ${roomId}`, err);
          }
        }
        
        // Create array of rooms with frequency
        const frequentRoomsList = Object.keys(roomFrequency).map(roomId => ({
          ...roomDetails[roomId],
          frequency: roomFrequency[roomId]
        }))
        .filter(room => room.room) // Only include rooms where we have details
        .sort((a, b) => b.frequency - a.frequency) // Sort by frequency (highest first)
        .slice(0, 3); // Take top 3
        
        setFrequentRooms(frequentRoomsList);
        setError(prev => ({...prev, frequentRooms: null}));
      } catch (err) {
        console.error("Error fetching frequent rooms:", err);
        setError(prev => ({...prev, frequentRooms: "Failed to load frequently booked rooms"}));
      } finally {
        setLoading(prev => ({...prev, frequentRooms: false}));
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
              <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {loading.bookings ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 size={30} className="animate-spin text-purple-500 mr-2" />
                    <span>Loading your bookings...</span>
                  </div>
                ) : error.bookings ? (
                  <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                    <p>{error.bookings}</p>
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
                  upcomingBookings.map((booking, index) => (
                    <div key={booking.id || index} className="bg-gray-700/50 p-6 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">
                            Room: {booking.room}
                          </h3>
                          <p className="text-gray-400 mt-1">{booking.building}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-300">
                                {booking.slot}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-300">
                                {booking.date}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-300">
                                Capacity: {booking.capacity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleModifyClick(booking)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Modify
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Frequently Booked Rooms */}
            <div className="section-card">
              <h2 className="card-header">
                <BookMarked className="h-5 w-5 mr-2 text-purple-500" />
                Frequently Booked Rooms
              </h2>
              <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {loading.frequentRooms ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 size={30} className="animate-spin text-purple-500 mr-2" />
                    <span>Loading frequently booked rooms...</span>
                  </div>
                ) : error.frequentRooms ? (
                  <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                    <p>{error.frequentRooms}</p>
                  </div>
                ) : frequentRooms.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p>No room booking history found.</p>
                  </div>
                ) : (
                  frequentRooms.map((room, index) => (
                    <div key={room.id || index} className="bg-gray-700/50 p-6 rounded-lg">
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
                  ))
                )}
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

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
  Loader2,
} from "lucide-react";
import api from "../../api";
import ModifyBookingModal from "../../components/ModifyBooking";
import NavBar from "../../components/NavBar";
import { DateTime } from "luxon";
import Footer from "../../components/Footer";
import Toast, { DeleteConfirmation } from "../../components/AlertToast";

function MyBookings() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [previousBookings, setPreviousBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add alert and confirmation state
  const [alert, setAlert] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  // Fetch bookings function to be called when tabs are clicked
  const fetchBookings = async (tabName) => {
    try {
      setLoading(true);

      // Make API call to get user's bookings
      const response = await api.get("bookings/?all=false");

      // Process the response data
      const bookings = response.data;
      const now = DateTime.now().toJSDate(); // Use local time

      // Split bookings into upcoming and previous
      const upcoming = [];
      const previous = [];

      for (const booking of bookings) {
        console.log("Booking:", booking);

        // Parse the start_time from the API response - use local time
        const startTime = DateTime.fromISO(booking.start_time);
        const endTime = DateTime.fromISO(booking.end_time);

        // Format date and time for display
        const formattedDate = startTime.toFormat("LLLL d, yyyy");
        const formattedTimeSlot = `${startTime.toFormat(
          "h a"
        )} - ${endTime.toFormat("h a")}`;

        // Extract room data - handle both object and ID cases
        let roomName = "Unknown Room";
        let buildingName = "Unknown Building";
        let roomCapacity = 0;

        if (booking.room) {
          if (typeof booking.room === "object") {
            // If room is already an object, extract data directly
            roomName = booking.room.name || "Unknown Room";
            buildingName = booking.room.building_name || "Unknown Building";
            roomCapacity = booking.room.capacity || 0;
          } else {
            // If room is just an ID, fetch the room details from API
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

        // Create a processed booking object with the required fields
        const processedBooking = {
          id: booking.id,
          roomName: roomName,
          building: buildingName,
          capacity: roomCapacity,
          status: booking.status,
          purpose: booking.purpose,
          participants: booking.participants,
          date: formattedDate,
          slot: formattedTimeSlot,
          startTime: startTime,
          endTime: endTime,
          amenities: booking.room?.amenities || [],
          originalBooking: booking, // Keep the original data for reference if needed
        };

        // Put cancelled or rejected bookings in previous, regardless of date
        if (
          booking.status.toLowerCase() === "cancelled" ||
          booking.status.toLowerCase() === "rejected"
        ) {
          previous.push(processedBooking);
        }
        // For non-cancelled/non-rejected bookings, use date to categorize
        else if (startTime.toJSDate() > now) {
          upcoming.push(processedBooking);
        } else {
          previous.push(processedBooking); // FIXED: Push the processed booking, not the original
        }
      }

      // Sort upcoming bookings by date (closest first)
      upcoming.sort((a, b) => {
        const dateA = DateTime.fromFormat(
          `${a.date} ${a.slot.split(" - ")[0]}`,
          "LLLL d, yyyy h a"
        );

        const dateB = DateTime.fromFormat(
          `${b.date} ${b.slot.split(" - ")[0]}`,
          "LLLL d, yyyy h a"
        );

        return dateA - dateB;
      });

      // Sort previous bookings by date (most recent first)
      previous.sort((a, b) => {
        const dateA = DateTime.fromFormat(
          `${a.date} ${a.slot.split(" - ")[0]}`,
          "LLLL d, yyyy h a"
        );

        const dateB = DateTime.fromFormat(
          `${b.date} ${b.slot.split(" - ")[0]}`,
          "LLLL d, yyyy h a"
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

  // Fetch bookings when component mounts
  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab]);

  const handleModify = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleCancel = async (bookingId) => {
    try {
      // Find the booking before attempting to cancel
      const bookingToCancel = upcomingBookings.find(
        (booking) => booking.id === bookingId
      );

      // Don't allow cancellation of rejected bookings
      if (
        bookingToCancel &&
        bookingToCancel.status.toLowerCase() === "rejected"
      ) {
        setAlert({
          show: true,
          type: "danger",
          message: "Cannot cancel a rejected booking.",
        });
        return;
      }

      await api.delete(`/bookings/${bookingId}/`);

      // Find the booking that was just cancelled
      const cancelledBooking = upcomingBookings.find(
        (booking) => booking.id === bookingId
      );

      if (cancelledBooking) {
        // Update the status to "CANCELLED"
        const updatedBooking = {
          ...cancelledBooking,
          status: "CANCELLED",
        };

        // Remove from upcoming bookings
        setUpcomingBookings(
          upcomingBookings.filter((booking) => booking.id !== bookingId)
        );

        // Add to previous bookings at the beginning (most recent)
        setPreviousBookings([updatedBooking, ...previousBookings]);
      }

      setAlert({
        show: true,
        type: "success",
        message: "Booking canceled successfully",
      });
    } catch (err) {
      console.error("Error canceling booking:", err);
      setAlert({
        show: true,
        type: "danger",
        message: "Failed to cancel booking. Please try again.",
      });
    }
  };

  // Add function to confirm deletion using the DeleteConfirmation component
  const handleDeleteClick = (bookingId) => {
    setBookingToDelete(bookingId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (bookingToDelete) {
      handleCancel(bookingToDelete);
      setShowDeleteConfirm(false);
    }
  };

  // Hide alert function
  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
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
                onClick={() => {
                  setActiveTab("upcoming");
                  fetchBookings("upcoming");
                }}
              >
                Upcoming Bookings
              </button>
              <button
                className={`px-6 py-2 rounded-lg transition-colors ${
                  activeTab === "previous"
                    ? "bg-plek-purple text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => {
                  setActiveTab("previous");
                  fetchBookings("previous");
                }}
              >
                Previous Bookings
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2
                size={40}
                className="animate-spin text-purple-500 mb-4"
              />
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
                <Link
                  to="/booking"
                  className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
                >
                  Book a room now
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-700 text-gray-300">
                    <tr>
                      <th className="p-3 rounded-tl-lg">Room</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Attendees</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-tr-lg text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBookings.map((booking, index) => (
                      <tr
                        key={booking.id}
                        className={`border-b border-gray-700 ${
                          index % 2 === 0
                            ? "bg-plek-dark" // Even rows use plek-dark color
                            : "bg-[#1E2631]" // using #1E2631 for odd rows
                        } hover:bg-plek-hover`} // Hover uses plek-hover color
                      >
                        <td className="p-3">
                          <div className="font-medium">{booking.roomName}</div>
                          <div className="text-xs text-gray-400">
                            {booking.building}
                          </div>
                        </td>
                        <td className="p-3">{booking.date}</td>
                        <td className="p-3">{booking.slot}</td>
                        <td className="p-3 max-w-[200px] truncate">
                          {booking.purpose || "N/A"}
                        </td>
                        <td className="p-3">
                          {booking.participants || booking.capacity || 0}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs 
                  ${
                    booking.status.toLowerCase() === "approved"
                      ? "bg-green-900/30 text-green-400"
                      : booking.status.toLowerCase() === "pending"
                      ? "bg-yellow-900/30 text-yellow-400"
                      : "bg-red-900/30 text-red-400"
                  }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {booking.status.toLowerCase() !== "rejected" && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleDeleteClick(booking.id)}
                                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleModify(booking)}
                                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                              >
                                Modify
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : previousBookings.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No previous bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700 text-gray-300">
                  <tr>
                    <th className="p-3 rounded-tl-lg">Room</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Attendees</th>
                    <th className="p-3 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previousBookings.map((booking, index) => (
                    <tr
                      key={booking.id}
                      className={`border-b border-gray-700 ${
                        index % 2 === 0
                          ? "bg-plek-dark" // Even rows use plek-dark color
                          : "bg-[#1E2631]"
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-medium">{booking.roomName}</div>
                        <div className="text-xs text-gray-400">
                          {booking.building}
                        </div>
                      </td>
                      <td className="p-3">{booking.date}</td>
                      <td className="p-3">{booking.slot}</td>
                      <td className="p-3 max-w-[200px] truncate">
                        {booking.purpose || "N/A"}
                      </td>
                      <td className="p-3">
                        {booking.participants || booking.capacity || 0}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs 
                ${
                  booking.status.toLowerCase() === "completed"
                    ? "bg-green-900/30 text-green-400"
                    : booking.status.toLowerCase() === "rejected" ||
                      booking.status.toLowerCase() === "cancelled"
                    ? "bg-red-900/30 text-red-400"
                    : "bg-gray-600/30 text-gray-400"
                }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            handleDeleteClick(id);
            setShowModifyModal(false);
          }}
        />
      )}

      {/* Toast Alert */}
      {alert.show && (
        <Toast
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onClose={hideAlert}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmButtonText="Cancel Booking"
      />
    </div>
  );
}

export default MyBookings;

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Clock,
  Users,
  Pencil,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

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
          notes: booking.notes,
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

  // Date range options for filtering
  const dateRanges = [
    { label: "All Dates", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  // Status options for filter
  const statusOptions =
    activeTab === "upcoming"
      ? [
          { label: "All Statuses", value: "all" },
          { label: "Approved", value: "approved" },
          { label: "Pending", value: "pending" },
        ]
      : [
          { label: "All Statuses", value: "all" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Rejected", value: "rejected" },
        ];

  // Get unique buildings from bookings
  const buildings = useMemo(() => {
    const currentBookings =
      activeTab === "upcoming" ? upcomingBookings : previousBookings;
    const uniqueBuildings = [
      "all",
      ...new Set(currentBookings.map((booking) => booking.building)),
    ];
    return uniqueBuildings;
  }, [activeTab, upcomingBookings, previousBookings]);

  // Filter bookings based on search query and filters
  const filterBookings = (bookings) => {
    return bookings.filter((booking) => {
      // Search functionality
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        booking.roomName.toLowerCase().includes(searchLower) ||
        (booking.purpose &&
          booking.purpose.toLowerCase().includes(searchLower)) ||
        booking.building.toLowerCase().includes(searchLower);

      // Building filter
      const matchesBuilding =
        selectedBuilding === "all" || booking.building === selectedBuilding;

      // Status filter
      const matchesStatus =
        selectedStatus === "all" ||
        booking.status.toLowerCase() === selectedStatus.toLowerCase();

      // Date range filter
      let matchesDateRange = true;
      if (selectedDateRange !== "all") {
        const bookingDate = DateTime.fromFormat(booking.date, "LLLL d, yyyy");
        const today = DateTime.now().startOf("day");

        if (selectedDateRange === "today") {
          matchesDateRange = bookingDate.hasSame(today, "day");
        } else if (selectedDateRange === "week") {
          const startOfWeek = today.startOf("week");
          const endOfWeek = today.endOf("week");
          matchesDateRange =
            bookingDate >= startOfWeek && bookingDate <= endOfWeek;
        } else if (selectedDateRange === "month") {
          matchesDateRange = bookingDate.hasSame(today, "month");
        }
      }

      return (
        matchesSearch && matchesBuilding && matchesStatus && matchesDateRange
      );
    });
  };

  // Apply filters to the current tab's bookings
  const filteredUpcomingBookings = useMemo(
    () => filterBookings(upcomingBookings),
    [
      upcomingBookings,
      searchQuery,
      selectedBuilding,
      selectedStatus,
      selectedDateRange,
    ]
  );

  const filteredPreviousBookings = useMemo(
    () => filterBookings(previousBookings),
    [
      previousBookings,
      searchQuery,
      selectedBuilding,
      selectedStatus,
      selectedDateRange,
    ]
  );

  return (
    <div className="page-container">
      {/* Navigation */}
      <NavBar activePage="my-bookings" />

      {/* Main Content */}
      <div className="main-content">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">
            My Bookings
          </h1>

          {/* Tab Navigation */}
          <div className="flex space-x-3 bg-gray-800 p-1 rounded-lg">
            <button
              className={`px-6 py-2.5 rounded-lg transition-colors ${
                activeTab === "upcoming"
                  ? "bg-plek-purple text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
              onClick={() => {
                setActiveTab("upcoming");
                fetchBookings("upcoming");
                setSelectedStatus("all"); // Reset status filter when changing tabs
              }}
            >
              Upcoming Bookings
            </button>
            <button
              className={`px-6 py-2.5 rounded-lg transition-colors ${
                activeTab === "previous"
                  ? "bg-plek-purple text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
              onClick={() => {
                setActiveTab("previous");
                fetchBookings("previous");
                setSelectedStatus("all"); // Reset status filter when changing tabs
              }}
            >
              Previous Bookings
            </button>
          </div>
        </div>

        {/* Search and filters section */}
        <div className="bg-gray-800/70 rounded-lg p-4 mb-6 shadow-md">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by room, building, or purpose..."
              className="w-full pl-12 pr-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-plek-purple placeholder-gray-400 border border-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white bg-gray-600 hover:bg-gray-500 p-1.5 rounded-md transition-colors"
              title={showFilters ? "Hide filters" : "Show filters"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>

          {/* Filter options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-600">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Building
                </label>
                <select
                  className="w-full bg-gray-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-plek-purple border border-gray-600 text-white"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  {buildings.map((building, index) => (
                    <option key={index} value={building}>
                      {building === "all" ? "All Buildings" : building}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Date Range
                </label>
                <select
                  className="w-full bg-gray-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-plek-purple border border-gray-600 text-white"
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                >
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Status
                </label>
                <select
                  className="w-full bg-gray-700 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-plek-purple border border-gray-600 text-white"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedBuilding("all");
                    setSelectedDateRange("all");
                    setSelectedStatus("all");
                    setSearchQuery("");
                  }}
                  className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm flex items-center space-x-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
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
          filteredUpcomingBookings.length === 0 ? (
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
            <div className="overflow-x-auto rounded-lg shadow-md">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-700/80 text-white">
                  <tr>
                    <th className="p-4 rounded-tl-lg">Room</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Attendees</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 rounded-tr-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcomingBookings.map((booking, index) => (
                    <tr
                      key={booking.id}
                      className={`border-b border-gray-700/50 ${
                        index % 2 === 0
                          ? "bg-plek-dark" // Even rows using plek-dark
                          : "bg-[#1E2631]" // Odd rows using plek-lightgray with transparency
                      } hover:bg-plek-hover/40 transition-colors`}
                    >
                      <td className="p-4">
                        <div className="font-medium text-white">
                          {booking.roomName}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <Building2 className="h-3 w-3 mr-1 text-purple-400" />
                          {booking.building}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <CalendarDays className="h-4 w-4 mr-2 text-purple-400" />
                          <span>{booking.date}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-purple-400" />
                          <span>{booking.slot}</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-[200px] truncate">
                        {booking.purpose || "N/A"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-purple-400" />
                          <span>
                            {booking.participants || booking.capacity || 0}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                  ${
                    booking.status.toLowerCase() === "approved"
                      ? "bg-green-900/30 text-green-400 border border-green-500/30"
                      : booking.status.toLowerCase() === "pending"
                      ? "bg-yellow-900/30 text-yellow-400 border border-yellow-500/30"
                      : "bg-red-900/30 text-red-400 border border-red-500/30"
                  }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              booking.status.toLowerCase() === "approved"
                                ? "bg-green-400"
                                : booking.status.toLowerCase() === "pending"
                                ? "bg-yellow-400"
                                : "bg-red-400"
                            }`}
                          ></span>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {booking.status.toLowerCase() !== "rejected" && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleDeleteClick(booking.id)}
                              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-red-900/70 text-gray-200 hover:text-white rounded transition-colors flex items-center"
                              title="Cancel booking"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleModify(booking)}
                              className="px-3 py-1.5 text-xs bg-plek-purple hover:bg-purple-700 text-white rounded transition-colors flex items-center"
                              title="Modify booking"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
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
        ) : filteredPreviousBookings.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No previous bookings found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-700/80 text-white">
                <tr>
                  <th className="p-4 rounded-tl-lg">Room</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Attendees</th>
                  <th className="p-4 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreviousBookings.map((booking, index) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-gray-700/50 ${
                      index % 2 === 0
                        ? "bg-plek-dark" // Even rows using plek-dark
                        : "bg-plek-lightgray/20" // Odd rows using plek-lightgray with transparency
                    } hover:bg-plek-hover/40 transition-colors`}
                  >
                    <td className="p-4">
                      <div className="font-medium text-white">
                        {booking.roomName}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center mt-1">
                        <Building2 className="h-3 w-3 mr-1 text-purple-400" />
                        {booking.building}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-purple-400" />
                        <span>{booking.date}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-purple-400" />
                        <span>{booking.slot}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-[200px] truncate">
                      {booking.purpose || "N/A"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-purple-400" />
                        <span>
                          {booking.participants || booking.capacity || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                ${
                  booking.status.toLowerCase() === "completed"
                    ? "bg-green-900/30 text-green-400 border border-green-500/30"
                    : booking.status.toLowerCase() === "rejected" ||
                      booking.status.toLowerCase() === "cancelled"
                    ? "bg-red-900/30 text-red-400 border border-red-500/30"
                    : "bg-gray-600/30 text-gray-400 border border-gray-500/30"
                }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            booking.status.toLowerCase() === "completed"
                              ? "bg-green-400"
                              : booking.status.toLowerCase() === "rejected" ||
                                booking.status.toLowerCase() === "cancelled"
                              ? "bg-red-400"
                              : "bg-gray-400"
                          }`}
                        ></span>
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

import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Clock,
  Users,
  Filter,
  Check,
  X,
  AlertCircle,
  Building2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "../api";
import { DateTime } from "luxon";
import ModifyBookingModal from "../components/ModifyBooking";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import Toast, { DeleteConfirmation } from "../components/AlertToast";

function ManageBookings() {
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    type: "success", // 'success', 'danger', or 'warning'
    message: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  // Filter states
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const firstName = localStorage.getItem("FirstName");

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  // Process bookings to match expected format
  const processBookings = (bookings) => {
    return bookings.map((booking) => {
      // Parse start and end times
      const startTime = DateTime.fromISO(booking.start_time, {
        zone: "Asia/Kolkata",
      });
      const endTime = DateTime.fromISO(booking.end_time, {
        zone: "Asia/Kolkata",
      });

      // Format date and time slot
      const formattedDate = startTime.toFormat("LLLL d, yyyy");
      const formattedTimeSlot = `${startTime.toFormat(
        "h a"
      )} - ${endTime.toFormat("h a")}`;

      // Create processed booking with correct structure
      return {
        id: booking.id,
        room: booking.room.name,
        building: booking.room.building_name,
        capacity: booking.room.capacity,
        date: formattedDate,
        slot: formattedTimeSlot,
        status: booking.status,
        purpose: booking.purpose,
        participants: booking.participants,
        user:
          typeof booking.user === "number"
            ? `User ${booking.user}`
            : booking.user,
        original: booking, // Keep original data in case we need it
      };
    });
  };

  // Fetch bookings data
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);

        // Get all bookings from a single endpoint
        const response = await api.get("/bookings/?all=true");

        const allBookings = processBookings(response.data || []);

        // Split bookings into pending requests and approved bookings
        const requests = allBookings.filter(
          (booking) => booking.status.toLowerCase() === "pending"
        );
        const approved = allBookings.filter(
          (booking) => booking.status.toLowerCase() === "approved"
        );

        setBookingRequests(requests);
        setApprovedBookings(approved);
        setError(null);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    // Refresh data every 2 minutes
    const intervalId = setInterval(() => {
      fetchBookings();
    }, 120000);

    return () => clearInterval(intervalId);
  }, []);

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleApprove = async (bookingId) => {
    try {
      const payload = {
        action: "approve",
      };

      const response = await api.post(
        `/bookings/approval/${bookingId}/`,
        payload
      );

      if (response.status === 200) {
        // Update local state
        const updatedRequests = bookingRequests.filter(
          (req) => req.id !== bookingId
        );
        const approvedBooking = bookingRequests.find(
          (req) => req.id === bookingId
        );

        if (approvedBooking) {
          approvedBooking.action = "APPROVED";
          setApprovedBookings([...approvedBookings, approvedBooking]);
        }

        setBookingRequests(updatedRequests);

        // Show success alert
        showAlert("success", "Booking request approved successfully!");
      }
    } catch (error) {
      console.error("Error approving booking:", error);
      showAlert("danger", "Failed to approve booking. Please try again.");
    }
  };

  const handleReject = async (bookingId) => {
    try {
      const payload = {
        action: "reject",
      };

      const response = await api.post(
        `/bookings/approval/${bookingId}/`,
        payload
      );

      if (response.status === 200) {
        // Remove the rejected booking from pending requests
        const updatedRequests = bookingRequests.filter(
          (req) => req.id !== bookingId
        );
        setBookingRequests(updatedRequests);

        // Show success alert
        showAlert("success", "Booking request rejected successfully!");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      showAlert("danger", "Failed to reject booking. Please try again.");
    }
  };

  const handleRejectApproved = async (bookingId) => {
    try {
      const payload = {
        action: "reject",
      };

      const response = await api.post(
        `/bookings/approval/${bookingId}/`,
        payload
      );

      if (response.status === 200) {
        // Remove the rejected booking from approved bookings
        const updatedApproved = approvedBookings.filter(
          (booking) => booking.id !== bookingId
        );
        setApprovedBookings(updatedApproved);

        // Show success alert
        showAlert("success", "Booking has been rejected!");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      showAlert("danger", "Failed to reject booking. Please try again.");
    } finally {
      setShowDeleteConfirm(false);
      setBookingToDelete(null);
    }
  };

  const handleDeleteClick = (bookingId) => {
    setBookingToDelete(bookingId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!bookingToDelete) return;

    // If we're in the approved bookings tab, reject the booking instead of deleting it
    if (activeTab === "bookings") {
      await handleRejectApproved(bookingToDelete);
      return;
    }

    // Otherwise delete the booking (for pending requests)
    try {
      const response = await api.delete(`/bookings/${bookingToDelete}/`);

      if (response.status === 204 || response.status === 200) {
        // Update local state
        const updatedRequests = bookingRequests.filter(
          (req) => req.id !== bookingToDelete
        );
        const updatedApproved = approvedBookings.filter(
          (booking) => booking.id !== bookingToDelete
        );

        setBookingRequests(updatedRequests);
        setApprovedBookings(updatedApproved);

        // Show success alert
        showAlert("success", "Booking cancelled successfully!");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showAlert("danger", "Failed to cancel booking. Please try again.");
    } finally {
      setShowDeleteConfirm(false);
      setBookingToDelete(null);
    }
  };

  // Extract unique buildings for filter dropdown
  const buildings = [
    "all",
    ...new Set([
      ...bookingRequests.map((booking) => booking.building),
      ...approvedBookings.map((booking) => booking.building),
    ]),
  ];

  // Date range options for filter
  const dateRanges = [
    { label: "All Dates", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  // Status options for filter (when in bookings tab)
  const statuses = [
    { label: "All Statuses", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Cancelled", value: "cancelled" },
  ];

  // Filter bookings based on search query and filters
  const filterBookings = (bookings) => {
    return bookings.filter((booking) => {
      const matchesSearch =
        booking.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.user?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBuilding =
        selectedBuilding === "all" || booking.building === selectedBuilding;

      // Date filtering
      let matchesDate = true;
      if (selectedDateRange !== "all") {
        const bookingDate = DateTime.fromFormat(booking.date, "LLLL d, yyyy");
        const today = DateTime.now().startOf("day");

        if (selectedDateRange === "today") {
          matchesDate = bookingDate.hasSame(today, "day");
        } else if (selectedDateRange === "week") {
          const startOfWeek = today.startOf("week");
          const endOfWeek = today.endOf("week");
          matchesDate = bookingDate >= startOfWeek && bookingDate <= endOfWeek;
        } else if (selectedDateRange === "month") {
          matchesDate = bookingDate.hasSame(today, "month");
        }
      }

      // Status filtering (only applies to bookings tab)
      const matchesStatus =
        selectedStatus === "all" ||
        booking.status?.toLowerCase() === selectedStatus;

      return matchesSearch && matchesBuilding && matchesDate && matchesStatus;
    });
  };

  const filteredRequests = filterBookings(bookingRequests);
  const filteredBookings = filterBookings(approvedBookings);

  // Get current data based on active tab
  const currentData =
    activeTab === "requests" ? filteredRequests : filteredBookings;

  return (
    <div className="page-container">
      <NavBar activePage="manage-bookings" />

      <div className="main-content">
        {/* Header with tab buttons */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Manage Bookings</h1>
          <div className="flex space-x-3">
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "requests"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("requests")}
            >
              Pending Requests
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "bookings"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("bookings")}
            >
              Approved Bookings
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search bookings by room, building, or user..."
              className="w-full pl-12 pr-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter
                className={`text-gray-300 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid-layout-2 gap-4 p-4 bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Building
                </label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {buildings.map((building, index) => (
                    <option key={index} value={building}>
                      {building === "all" ? "All Buildings" : building}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date Range
                </label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              {activeTab === "bookings" && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Booking Cards Grid Layout */}
        <div className="grid-layout-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-4 text-gray-300">Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="col-span-3 text-center py-10">
              <div className="text-red-400 text-xl mb-2">⚠️</div>
              <p className="text-gray-300">{error}</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="col-span-3 text-center py-10">
              <p className="text-gray-300">
                {activeTab === "requests"
                  ? "No pending booking requests found."
                  : "No approved bookings found."}
              </p>
            </div>
          ) : (
            currentData.map((booking) => (
              <div key={booking.id} className="section-card">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold">
                    Room: {booking.room}
                  </h3>
                  <div className="flex space-x-2">
                    {activeTab === "requests" ? (
                      <>
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="p-2 hover:bg-plek-purple/20 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check size={18} className="text-green-400" />
                        </button>
                        <button
                          onClick={() => handleReject(booking.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X size={18} className="text-red-400" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleModifyClick(booking)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Modify"
                        >
                          <Pencil size={18} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(booking.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X size={18} className="text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-gray-400 mt-1">{booking.building}</p>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      {booking.slot}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      {booking.date}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      Capacity: {booking.capacity}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      {activeTab === "requests"
                        ? "Requested by: "
                        : "Booked by: "}
                      {booking.user}
                    </span>
                  </div>
                </div>

                {booking.purpose && (
                  <div className="mt-3 border-t border-gray-700 pt-2">
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400">Purpose:</span>{" "}
                      {booking.purpose}
                    </p>
                  </div>
                )}

                {booking.status && (
                  <div className="mt-3">
                    <span className="inline-block px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                      {booking.status}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />

      {/* Modify Booking Modal */}
      {showModifyModal && selectedBooking && (
        <ModifyBookingModal
          booking={selectedBooking}
          onClose={() => setShowModifyModal(false)}
          onCancel={handleDeleteClick}
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

      {/* Delete/Reject Confirmation Dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title={activeTab === "bookings" ? "Reject Booking" : "Cancel Booking"}
        message={
          activeTab === "bookings"
            ? "Are you sure you want to reject this approved booking? This action cannot be undone."
            : "Are you sure you want to cancel this booking? This action cannot be undone."
        }
        confirmButtonText={
          activeTab === "bookings" ? "Reject" : "Cancel Booking"
        }
      />
    </div>
  );
}

export default ManageBookings;

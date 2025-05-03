import React, { useState, useContext, useEffect } from "react";
import {
  Calendar,
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
  Bell,
  AlertCircle,
  CheckCircle,
  PieChart,
  Settings,
  Shield,
  BarChart,
  Clock8,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import BookingModal from "../../components/ConfirmBooking";
import ModifyBookingModal from "../../components/ModifyBooking";
import api from "../../api";
import { AuthContext } from "../../context/AuthProvider";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { DateTime } from "luxon";

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const firstName =
    user?.first_name ||
    user?.firstName ||
    localStorage.getItem("firstName") ||
    "Admin";

  // Simplified user role determination
  const [userRole, setUserRole] = useState("admin");
  const [loading, setLoading] = useState({
    profile: true,
    bookings: true,
    rooms: true,
    notifications: true,
  });

  // Fetch profile once at component mount to determine exact role
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await api.get("/api/accounts/profile/");

        if (response.status === 200) {
          const profileData = response.data;

          // Determine role based on is_superuser flag and groups
          if (profileData.is_superuser) {
            setUserRole("superadmin");
          } else {
            // Check for group membership
            const groups = profileData.groups || [];
            const groupNames = Array.isArray(groups)
              ? groups.map((g) =>
                  typeof g === "string"
                    ? g.toLowerCase()
                    : g.name?.toLowerCase()
                )
              : [];

            if (groupNames.includes("admin")) {
              setUserRole("admin");
            } else if (groupNames.includes("coordinator")) {
              setUserRole("coordinator");
            }
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        // Fall back to basic role determination based on is_superuser
        setUserRole(user?.is_superuser ? "superadmin" : "admin");
      } finally {
        setLoading((prev) => ({ ...prev, profile: false }));
      }
    };

    fetchProfileData();
  }, [user]);

  // Other state variables for admin dashboard
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingStats, setBookingStats] = useState({
    todayBookings: 0,
    pendingApprovals: 0,
  });
  const [roomStats, setRoomStats] = useState({
    maintenance: 0,
    utilizationRate: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState({
    bookings: null,
    rooms: null,
    notifications: null,
  });
  const navigate = useNavigate();

  // Get current date and time
  const currentDate = DateTime.now()
    .setLocale("en-US")
    .toLocaleString(DateTime.DATE_FULL);
  const currentTime = DateTime.now()
    .setLocale("en-US")
    .toLocaleString(DateTime.TIME_SIMPLE);

  // Fetch booking statistics
  useEffect(() => {
    // Skip fetching if profile is still loading
    if (loading.profile) {
      return;
    }

    const fetchBookingStats = async () => {
      try {
        setLoading((prev) => ({ ...prev, bookings: true }));

        let bookings = [];

        // Use the appropriate endpoint based on user role
        if (userRole === "coordinator") {
          // Coordinators should use floor-dept endpoint which has appropriate permissions
          const response = await api.get("/bookings/floor-dept/");
          bookings = response.data.bookings || [];
        } else {
          // Admins and superadmins can use the all bookings endpoint
          const response = await api.get("/bookings/all/");
          bookings = response.data || [];
        }

        // Calculate today's bookings
        const today = DateTime.now().startOf("day");
        const todayBookings = bookings.filter((booking) => {
          const bookingDate = DateTime.fromISO(booking.start_time).startOf(
            "day"
          );
          return (
            bookingDate.equals(today) &&
            booking.status.toLowerCase() === "approved"
          );
        });

        // Calculate pending approvals
        const pendingApprovals = bookings.filter(
          (booking) => booking.status.toLowerCase() === "pending"
        );

        // Set booking stats
        setBookingStats({
          todayBookings: todayBookings.length,
          pendingApprovals: pendingApprovals.length,
        });

        // Save a subset of upcoming bookings for display
        const processed = bookings
          .filter((booking) => {
            const startTime = DateTime.fromISO(booking.start_time);
            return (
              startTime > DateTime.now() &&
              booking.status.toLowerCase() === "approved"
            );
          })
          .slice(0, 5)
          .map((booking) => processBookingForDisplay(booking));

        setUpcomingBookings(processed);
        setError((prev) => ({ ...prev, bookings: null }));

        // Now that we have the bookings data, fetch room stats with this data
        fetchRoomStats(bookings);
      } catch (err) {
        console.error("Error fetching booking statistics:", err);
        setError((prev) => ({
          ...prev,
          bookings: "Failed to load booking statistics",
        }));
        // Still try to fetch room stats even if bookings failed
        fetchRoomStats([]);
      } finally {
        setLoading((prev) => ({ ...prev, bookings: false }));
      }
    };

    fetchBookingStats();
  }, [userRole, loading.profile]);

  // Fetch room statistics - modified to accept bookings data
  const fetchRoomStats = async (existingBookings = []) => {
    try {
      setLoading((prev) => ({ ...prev, rooms: true }));

      // Get all rooms
      const roomsResponse = await api.get("/rooms/");
      const rooms = roomsResponse.data || [];

      // Count maintenance rooms
      const maintenanceRooms = rooms.filter((room) => !room.available);

      // Calculate utilization rate for next 5 days using existing bookings data
      const utilizationRate = calculateUtilizationRate(rooms, existingBookings);

      // Set room stats
      setRoomStats({
        maintenance: maintenanceRooms.length,
        utilizationRate,
      });

      setError((prev) => ({ ...prev, rooms: null }));
    } catch (err) {
      console.error("Error fetching room statistics:", err);
      setError((prev) => ({
        ...prev,
        rooms: "Failed to load room statistics",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, rooms: false }));
    }
  };

  // Modified to use existing bookings data instead of making another API call
  const calculateUtilizationRate = (rooms, existingBookings) => {
    try {
      if (!rooms || rooms.length === 0) return 0;

      // Define the date range for the next 5 days
      const startDate = DateTime.now().startOf("day");
      const endDate = startDate.plus({ days: 5 });

      // Use the existing bookings data passed as parameter
      const allBookings = existingBookings || [];

      // Filter bookings for next 5 days that are approved
      const relevantBookings = allBookings.filter((booking) => {
        const bookingDate = DateTime.fromISO(booking.start_time);
        return (
          bookingDate >= startDate &&
          bookingDate <= endDate &&
          booking.status.toLowerCase() === "approved"
        );
      });

      // Filter only available rooms
      const availableRooms = rooms.filter((room) => room.available);

      // Calculate total bookable time slots (8am-6pm = 10 slots per day per room)
      const timeSlots = 10; // Number of bookable hours in a day (e.g., 8am-6pm)
      const days = 5; // Next 5 days

      // Total possible time slots across all available rooms for 5 days
      const totalPossibleTimeSlots = availableRooms.length * timeSlots * days;

      // Count booked time slots
      let bookedTimeSlots = 0;

      relevantBookings.forEach((booking) => {
        const startTime = DateTime.fromISO(booking.start_time);
        const endTime = DateTime.fromISO(booking.end_time);

        // Calculate how many hour slots this booking takes up
        const durationHours = Math.ceil(endTime.diff(startTime, "hours").hours);

        // Add to the total booked time slots
        bookedTimeSlots += durationHours;
      });

      // Calculate utilization rate based on time slots
      const utilizationRate =
        totalPossibleTimeSlots === 0
          ? 0
          : Math.round((bookedTimeSlots / totalPossibleTimeSlots) * 100);

      return utilizationRate > 100 ? 100 : utilizationRate; // Cap at 100%
    } catch (err) {
      console.error("Error calculating utilization rate:", err);
      return 0;
    }
  };

  // Process a booking object for display
  const processBookingForDisplay = (booking) => {
    try {
      // Parse start and end times
      const startTime = DateTime.fromISO(booking.start_time);
      const endTime = DateTime.fromISO(booking.end_time);

      // Format date and time slot
      const formattedDate = startTime.toFormat("LLLL d, yyyy");
      const formattedTimeSlot = `${startTime.toFormat(
        "h a"
      )} - ${endTime.toFormat("h a")}`;

      // Extract room information
      let roomName = "Unknown Room";
      let buildingName = "Unknown Building";
      let roomCapacity = 0;

      if (booking.room) {
        if (typeof booking.room === "object") {
          roomName = booking.room.name || "Unknown Room";
          buildingName = booking.room.building_name || "Unknown Building";
          roomCapacity = booking.room.capacity || 0;
        }
      }

      return {
        id: booking.id,
        room: roomName,
        building: buildingName,
        capacity: roomCapacity,
        date: formattedDate,
        slot: formattedTimeSlot,
        status: booking.status,
        user: booking.user_name || "Unknown User",
      };
    } catch (err) {
      console.error("Error processing booking:", err);
      return {
        id: booking.id || "unknown",
        room: "Error processing room",
        building: "Unknown",
        capacity: 0,
        date: "Unknown date",
        slot: "Unknown time",
        status: booking.status || "unknown",
        user: "Unknown User",
      };
    }
  };

  const handleBookClick = (room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleViewAllBookings = () => {
    navigate("/admin/manage-bookings");
  };

  const handleViewAllRooms = () => {
    navigate("/admin/manage-rooms");
  };

  return (
    <div className="page-container">
      {/* Navigation Bar */}
      <NavBar activePage="admin-dashboard" />

      {/* Main Content */}
      <div className="main-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Welcome Section */}
          <div className="lg:col-span-2">
            <div className="section-card bg-plek-dark border-l-4 border-plek-purple">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2">
                    Welcome, {firstName}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300">
                      <span className="font-medium">
                        {userRole === "superadmin"
                          ? "Super Administrator"
                          : "Administrator"}
                      </span>{" "}
                      • {currentDate} • {currentTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Snapshot - Updated for real data */}
          <div className="section-card">
            <h2 className="card-header">
              <ClipboardCheck className="h-5 w-5 mr-2 text-white" />
              Booking Snapshot
            </h2>

            {loading.bookings ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-plek-purple"></div>
              </div>
            ) : error.bookings ? (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                <p>{error.bookings}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mt-4">
                {/* Today's Bookings */}
                <div className="p-6 bg-plek-lightgray rounded-lg flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-plek-dark mr-4">
                      <Calendar size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">Today's Bookings</p>
                      <p className="text-gray-300">Active reservations</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">
                    {bookingStats.todayBookings}
                  </span>
                </div>

                {/* Pending Approvals */}
                <div className="p-6 bg-plek-lightgray rounded-lg flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-plek-dark mr-4">
                      <Clock8 size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <p className="font-medium text-lg">Pending Approvals</p>
                      </div>
                      <p className="text-gray-300">Awaiting review</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">
                    {bookingStats.pendingApprovals}
                  </span>
                </div>

                <button
                  onClick={handleViewAllBookings}
                  className="w-full mt-2 py-3 bg-plek-purple hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center text-lg"
                >
                  <span>Manage All Bookings</span>
                </button>
              </div>
            )}
          </div>

          {/* Room Statistics - Updated to show real data */}
          <div className="section-card">
            <h2 className="card-header">
              <Building2 className="h-5 w-5 mr-2 text-white" />
              Room Statistics
            </h2>

            {loading.rooms ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-plek-purple"></div>
              </div>
            ) : error.rooms ? (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                <p>{error.rooms}</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-4 mt-4">
                {/* Maintenance Alerts */}
                <div className="p-6 bg-plek-lightgray rounded-lg flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="rounded-full p-3 bg-plek-dark mr-4">
                      <Settings size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">Maintenance</p>
                      <p className="text-gray-300">Unavailable rooms</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">
                    {roomStats.maintenance}
                  </span>
                </div>

                {/* Utilization Rate */}
                <div className="p-6 bg-plek-lightgray rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <div className="rounded-full p-3 bg-plek-dark mr-4">
                        <PieChart size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">Utilization Rate</p>
                        <p className="text-gray-300">Next 5 days</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">
                      {roomStats.utilizationRate}%
                    </span>
                  </div>
                  <div className="w-full bg-plek-dark rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-plek-purple"
                      style={{ width: `${roomStats.utilizationRate}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={handleViewAllRooms}
                  className="w-full mt-2 py-3 bg-plek-purple hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center text-lg"
                >
                  <span>Manage All Rooms</span>
                </button>
              </div>
            )}
          </div>

          {/* Notifications Feed - Full Width */}
          <div className="section-card lg:col-span-2">
            <h2 className="card-header">
              <Bell className="h-5 w-5 mr-2 text-white" />
              Notifications
            </h2>

            {loading.notifications ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-plek-purple"></div>
              </div>
            ) : error.notifications ? (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
                <p>{error.notifications}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 rounded-lg border-l-4 border-plek-purple bg-plek-lightgray"
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Super Admin Section - Only visible for Super Admins */}
          {userRole === "superadmin" && (
            <div className="mt-6 lg:col-span-2">
              <div className="section-card bg-plek-dark border-l-4 border-plek-purple">
                <div className="flex items-center mb-4">
                  <Shield className="h-6 w-6 mr-2 text-white" />
                  <h2 className="text-xl font-bold">
                    Super Administrator Controls
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Link
                    to="/admin/settings"
                    className="p-6 bg-plek-lightgray rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center mb-2">
                      <Settings className="h-6 w-6 mr-2 text-white" />
                      <h3 className="font-medium text-lg">
                        Institute Settings
                      </h3>
                    </div>
                    <p className="text-gray-300">
                      Configure global system settings and policies
                    </p>
                  </Link>

                  <Link
                    to="/admin/policies"
                    className="p-6 bg-plek-lightgray rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center mb-2">
                      <ClipboardCheck className="h-6 w-6 mr-2 text-white" />
                      <h3 className="font-medium text-lg">Booking Policies</h3>
                    </div>
                    <p className="text-gray-300">
                      Manage reservation rules and restrictions
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          )}
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
        />
      )}
    </div>
  );
}

export default Dashboard;

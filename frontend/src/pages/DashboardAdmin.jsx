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
  Bell,
  AlertCircle,
  CheckCircle,
  PieChart,
  Settings,
  Shield,
  BarChart,
  Clock8,
  ClipboardCheck,
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
    user?.first_name ||
    user?.firstName ||
    localStorage.getItem("firstName") ||
    "Admin";
  const isSuper = user?.is_superuser || user?.isSuperAdmin || false;

  // State variables for admin dashboard
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingStats, setBookingStats] = useState({
    todayBookings: 12,
    pendingApprovals: 3,
    conflicts: 1,
  });
  const [roomStats, setRoomStats] = useState({
    availableNow: 7,
    maintenance: 2,
    utilizationRate: 70,
  });
  const navigate = useNavigate();

  // Get current date and time
  const currentDate = DateTime.now()
    .setLocale("en-US")
    .toLocaleString(DateTime.DATE_FULL);
  const currentTime = DateTime.now()
    .setLocale("en-US")
    .toLocaleString(DateTime.TIME_SIMPLE);

  // Mock notifications for admin
  const notifications = [
    {
      id: 1,
      message: "New booking request from Jane Smith for Room A104",
      time: "5 minutes ago",
    },
    {
      id: 2,
      message: "Booking conflict detected in Room B202 at 2:00 PM",
      time: "15 minutes ago",
    },
    {
      id: 3,
      message: "Room C303 reported technical issues with projector",
      time: "45 minutes ago",
    },
    {
      id: 4,
      message: "Calendar sync completed successfully",
      time: "1 hour ago",
    },
    {
      id: 5,
      message: "Booking policy updated by Super Admin",
      time: "2 hours ago",
    },
  ];

  // Mock upcoming bookings
  const upcomingBookings = [
    {
      id: 1,
      room: "B512",
      building: "Research and Development Building",
      slot: "4:00 PM - 5:00 PM",
      date: "April 13, 2025",
      capacity: 8,
      user: "Emily Johnson",
      status: "approved",
    },
    {
      id: 2,
      room: "A204",
      building: "Main Building",
      slot: "2:00 PM - 3:00 PM",
      date: "April 14, 2025",
      capacity: 12,
      user: "Michael Torres",
      status: "approved",
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

  const handleViewAllBookings = () => {
    navigate("/manage-bookings");
  };

  const handleViewAllRooms = () => {
    navigate("/manage-rooms");
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
                        {isSuper ? "Super Administrator" : "Administrator"}
                      </span>{" "}
                      • {currentDate} • {currentTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Snapshot - Expanded */}
          <div className="section-card">
            <h2 className="card-header">
              <ClipboardCheck className="h-5 w-5 mr-2 text-white" />
              Booking Snapshot
            </h2>

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

              {/* Conflicts */}
              <div className="p-6 bg-plek-lightgray rounded-lg flex justify-between items-center">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-plek-dark mr-4">
                    <AlertCircle size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium text-lg">Conflicts</p>
                    </div>
                    <p className="text-gray-300">Policy violations</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">
                  {bookingStats.conflicts}
                </span>
              </div>

              <button
                onClick={handleViewAllBookings}
                className="w-full mt-2 py-3 bg-plek-purple hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center text-lg"
              >
                <span>Manage All Bookings</span>
              </button>
            </div>
          </div>

          {/* Room Availability Glance - Expanded */}
          <div className="section-card">
            <h2 className="card-header">
              <Building2 className="h-5 w-5 mr-2 text-white" />
              Room Availability
            </h2>

            <div className="flex flex-col space-y-4 mt-4">
              {/* Available Rooms */}
              <div className="p-6 bg-plek-lightgray rounded-lg flex justify-between items-center">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-plek-dark mr-4">
                    <BookMarked size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Available Now</p>
                    <p className="text-gray-300">Free rooms</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">
                  {roomStats.availableNow}
                </span>
              </div>

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
                    <p className="font-medium text-lg">Utilization Rate</p>
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
          </div>

          {/* Notifications Feed - Full Width */}
          <div className="section-card lg:col-span-2">
            <h2 className="card-header">
              <Bell className="h-5 w-5 mr-2 text-white" />
              Notifications
            </h2>

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
            
            {/* Removed "View All Notifications" button */}
          </div>
        </div>

        {/* Super Admin Section - Only visible for Super Admins */}
        {isSuper && (
          <div className="mt-6">
            <div className="section-card bg-plek-dark border-l-4 border-plek-purple">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 mr-2 text-white" />
                <h2 className="text-xl font-bold">
                  Super Administrator Controls
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  to="/settings"
                  className="p-6 bg-plek-lightgray rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <Settings className="h-6 w-6 mr-2 text-white" />
                    <h3 className="font-medium text-lg">Institute Settings</h3>
                  </div>
                  <p className="text-gray-300">
                    Configure global system settings and policies
                  </p>
                </Link>

                <Link
                  to="/policies"
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

                <Link
                  to="/conflicts"
                  className="p-6 bg-plek-lightgray rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <AlertCircle className="h-6 w-6 mr-2 text-white" />
                    <h3 className="font-medium text-lg">Conflict Management</h3>
                  </div>
                  <p className="text-gray-300">
                    Resolve booking conflicts and policy violations
                  </p>
                </Link>
              </div>
            </div>
          </div>
        )}
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

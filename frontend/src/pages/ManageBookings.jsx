import React, { useState } from "react";
import { Link } from "react-router-dom";
import ModifyBookingModal from "../components/ModifyBooking";

function ManageBookings() {
  const [activeTab, setActiveTab] = useState("requests");
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const firstName = localStorage.getItem("FirstName");

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const bookingRequests = [
    {
      id: 1,
      room: "B512",
      building: "Research and Development Building",
      slot: "4 - 5 pm",
      date: "6th February 2025",
      capacity: 8,
      user: "RameshS",
    },
    {
      id: 2,
      room: "B512",
      building: "Research and Development Building",
      slot: "4 - 5 pm",
      date: "6th February 2025",
      capacity: 8,
      user: "RameshS",
    },
    {
      id: 3,
      room: "B512",
      building: "Research and Development Building",
      slot: "4 - 5 pm",
      date: "6th February 2025",
      capacity: 8,
      user: "RameshS",
    },
  ];

  const approvedBookings = [
    {
      id: 101,
      room: "A204",
      building: "Administration Building",
      slot: "2 - 3 pm",
      date: "5th February 2025",
      capacity: 12,
      user: "PriyaM",
      status: "Approved",
    },
    {
      id: 102,
      room: "C110",
      building: "Conference Center",
      slot: "10 - 11 am",
      date: "7th February 2025",
      capacity: 20,
      user: "AjayK",
      status: "Approved",
    },
    {
      id: 103,
      room: "B512",
      building: "Research and Development Building",
      slot: "1 - 2 pm",
      date: "8th February 2025",
      capacity: 8,
      user: "NeelaP",
      status: "Approved",
    },
  ];

  const handleApprove = (bookingId) => {
    // Handle approve logic
    console.log("Approved booking:", bookingId);
  };

  const handleCancel = (bookingId) => {
    // Handle cancel logic
    console.log("Cancelled booking:", bookingId);
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-plek-background text-gray-100">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4 bg-plek-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <span className="ml-2 text-xl font-semibold">Plek</span>
            </div>
            <div className="flex space-x-6">
              <a
                href="dashboard"
                className="text-gray-400 hover:text-gray-300"
              >
                Dashboard
              </a>
              <a href="booking" className="text-gray-400 hover:text-gray-300">
                Book a room
              </a>
              <a
                href="my-bookings"
                className="text-gray-400 hover:text-gray-300"
              >
                My Bookings
              </a>
              <a
                href="manage-bookings"
                className="text-purple-400 hover:text-purple-300"
              >
                Manage Bookings
              </a>
              <a href="manage-rooms" className="text-gray-400 hover:text-gray-300">Manage Rooms</a>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {firstName?.charAt(0)}
              </span>
            </div>
            <span>{firstName}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="min-w-[99vw] mx-auto px-4 py-10 flex-grow">
        {/* Tab Navigation and Content */}
        <div className="bg-black p-6 rounded-lg mb-14">
          <div className="flex space-x-4 mb-6">
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "requests"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("requests")}
            >
              Requests
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "bookings"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("bookings")}
            >
              Bookings
            </button>
          </div>

          {/* Scrollable Content - Conditional rendering based on active tab */}
          <div className="max-h-[75vh] overflow-y-auto custom-scrollbar rounded-lg p-2 max-w-full w-full mx-auto">
            {activeTab === "requests" ? (
              <div className="space-y-4">
                {bookingRequests.map((booking) => (
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
                          <p className="text-gray-300">SLOT: {booking.slot}</p>
                          <p className="text-gray-300">Date: {booking.date}</p>
                          <p className="text-gray-300">
                            Capacity: {booking.capacity}
                          </p>
                          <p className="text-gray-300">User: {booking.user}</p>
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
                          onClick={() => handleApprove(booking.id)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {approvedBookings.map((booking) => (
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
                          <p className="text-gray-300">SLOT: {booking.slot}</p>
                          <p className="text-gray-300">Date: {booking.date}</p>
                          <p className="text-gray-300">
                            Capacity: {booking.capacity}
                          </p>
                          <p className="text-gray-300">User: {booking.user}</p>
                          <p className="text-green-400">
                            Status: {booking.status}
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
                          onClick={() => handleModifyClick(booking)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                          Modify
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

export default ManageBookings;

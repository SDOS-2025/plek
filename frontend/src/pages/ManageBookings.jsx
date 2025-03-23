import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Calendar, CalendarClock, CalendarDays, Clock, Users, Projector, Wifi, X, Trash2 } from "lucide-react";

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

  const ModifyBookingModal = ({ booking, onClose }) => {
    const [purpose, setPurpose] = useState('Team Meeting');
    const [attendees, setAttendees] = useState('6');
    const [notes, setNotes] = useState('Need whiteboard markers');
    const [date, setDate] = useState(booking.date);
    const [timeSlot, setTimeSlot] = useState(booking.slot);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showRoomPicker, setShowRoomPicker] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState({
      room: booking.room,
      building: booking.building,
      capacity: booking.capacity
    });

    const availableRooms = [
      {
        room: "A204",
        building: "Administration Building",
        capacity: 12
      },
      {
        room: "B512",
        building: "Research and Development Building",
        capacity: 8
      },
      {
        room: "C110",
        building: "Conference Center",
        capacity: 20
      }
    ];

    const availableDates = [
      "6th February 2025",
      "7th February 2025",
      "8th February 2025",
      "9th February 2025",
      "10th February 2025"
    ];

    const availableTimeSlots = [
      "9 - 10 am",
      "10 - 11 am",
      "11 - 12 pm",
      "1 - 2 pm",
      "2 - 3 pm",
      "3 - 4 pm",
      "4 - 5 pm"
    ];

    const handleSubmit = (e) => {
      e.preventDefault();
      // Handle booking modification here
      onClose();
    };

    const handleDelete = () => {
      // Handle booking deletion here
      if (confirm("Are you sure you want to cancel this booking?")) {
        // Delete booking logic
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Modify Booking</h2>
            <p className="text-gray-400">Update booking details for {booking.user}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="relative">
                <div 
                  className="flex items-center space-x-3 text-gray-300 cursor-pointer p-2 hover:bg-gray-700 rounded-lg"
                  onClick={() => setShowRoomPicker(!showRoomPicker)}
                >
                  <Building2 size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Room</p>
                    <p>{selectedRoom.room} - {selectedRoom.building}</p>
                  </div>
                </div>
                {showRoomPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-lg p-3 z-10 w-full">
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {availableRooms.map((room, index) => (
                        <div 
                          key={index} 
                          className={`p-2 rounded-lg cursor-pointer ${
                            room.room === selectedRoom.room ? 'bg-purple-600' : 'hover:bg-gray-600'
                          }`}
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowRoomPicker(false);
                          }}
                        >
                          {room.room} - {room.building}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <div 
                  className="flex items-center space-x-3 text-gray-300 cursor-pointer p-2 hover:bg-gray-700 rounded-lg"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  <CalendarDays size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p>{date}</p>
                  </div>
                </div>
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-lg p-3 z-10 w-full">
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {availableDates.map((d, index) => (
                        <div 
                          key={index} 
                          className={`p-2 rounded-lg cursor-pointer ${d === date ? 'bg-purple-600' : 'hover:bg-gray-600'}`}
                          onClick={() => {
                            setDate(d);
                            setShowDatePicker(false);
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <div 
                  className="flex items-center space-x-3 text-gray-300 cursor-pointer p-2 hover:bg-gray-700 rounded-lg"
                  onClick={() => setShowTimePicker(!showTimePicker)}
                >
                  <CalendarClock size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Time Slot</p>
                    <p>{timeSlot}</p>
                  </div>
                </div>
                {showTimePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-lg p-3 z-10 w-full">
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {availableTimeSlots.map((slot, index) => (
                        <div 
                          key={index} 
                          className={`p-2 rounded-lg cursor-pointer ${slot === timeSlot ? 'bg-purple-600' : 'hover:bg-gray-600'}`}
                          onClick={() => {
                            setTimeSlot(slot);
                            setShowTimePicker(false);
                          }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Users size={20} />
                <div>
                  <p className="text-sm text-gray-400">Capacity</p>
                  <p>{selectedRoom.capacity} people</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Available Amenities</h3>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-gray-300">
                <Projector size={18} />
                <span>Projector</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Wifi size={18} />
                <span>Wi-Fi</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Purpose of Booking
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g., Team Meeting, Workshop, Training"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Attendees
              </label>
              <input
                type="number"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                max={selectedRoom.capacity}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter number of attendees"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 h-32"
                placeholder="Any special requirements or notes"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                <span>Cancel Booking</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
                href="Dashboard"
                className="text-gray-400 hover:text-gray-300"
              >
                Dashboard
              </a>
              <a href="booking" className="text-gray-400 hover:text-gray-300">
                Book a room
              </a>
              <a
                href="MyBookings"
                className="text-gray-400 hover:text-gray-300"
              >
                My Bookings
              </a>
              <a
                href="ManageBookings"
                className="text-purple-400 hover:text-purple-300"
              >
                Manage Bookings
              </a>
              <a href="/ManageRooms" className="text-gray-400 hover:text-gray-300">Manage Rooms</a>
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
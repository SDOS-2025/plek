import React, { useState } from "react";
import { Calendar, Clock, Users, Activity, BookMarked, Projector, Wifi, X, Building2, CalendarDays, CalendarClock, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

function Dashboard() {
  const firstName = localStorage.getItem("FirstName");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const handleBookClick = (room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const BookingModal = ({ room, onClose }) => {
    const [purpose, setPurpose] = useState('');
    const [attendees, setAttendees] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      // Handle booking submission here
      onClose();
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
            <h2 className="text-2xl font-bold mb-2">Confirm Booking</h2>
            <p className="text-gray-400">Please review and confirm your room booking details</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300">
                <Building2 size={20} />
                <div>
                  <p className="text-sm text-gray-400">Room</p>
                  <p>{room.room} - {room.building}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Calendar size={20} />
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p>Today</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300">
                <Clock size={20} />
                <div>
                  <p className="text-sm text-gray-400">Time Slot</p>
                  <p>Next available</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Users size={20} />
                <div>
                  <p className="text-sm text-gray-400">Capacity</p>
                  <p>{room.capacity} people</p>
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
                max={room.capacity}
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
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Confirm Booking
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ModifyBookingModal = ({ booking, onClose }) => {
    const [purpose, setPurpose] = useState('Team Meeting');
    const [attendees, setAttendees] = useState('6');
    const [notes, setNotes] = useState('Need whiteboard markers');
    const [date, setDate] = useState(booking.date);
    const [timeSlot, setTimeSlot] = useState(booking.slot);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

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
            <p className="text-gray-400">Update your room booking details</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300">
                <Building2 size={20} />
                <div>
                  <p className="text-sm text-gray-400">Room</p>
                  <p>{booking.room} - {booking.building}</p>
                </div>
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
                  <p>{booking.capacity} people</p>
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
                max={booking.capacity}
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
    <div className="flex flex-col min-h-screen bg-plek-background text-gray-100">
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
                className="text-purple-400 hover:text-purple-300"
              >
                Dashboard
              </a>
              <a href="Booking" className="text-gray-400 hover:text-gray-300">
                Book a room
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-300">
                My Bookings
              </a>
              <a href="ManageBookings" className="text-gray-400 hover:text-gray-300">
                Manage Bookings
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center">
                <span className="text-sm font-medium"></span>
              </div>
              <span className="ml-2">{firstName}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 flex-grow mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="bg-plek-dark rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
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
            <div className="bg-plek-dark rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                Upcoming Bookings
              </h2>
              <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {[
                  {
                    room: "B512",
                    building: "Research and Development Building",
                    slot: "4 - 5 pm",
                    date: "6th February 2025",
                    capacity: 8,
                  },
                  {
                    room: "B512",
                    building: "Research and Development Building",
                    slot: "2 - 3 pm",
                    date: "7th February 2025",
                    capacity: 8,
                  },
                ].map((booking, index) => (
                  <div key={index} className="bg-gray-700/50 p-6 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">
                          Room: {booking.room}
                        </h3>
                        <p className="text-gray-400 mt-1">{booking.building}</p>
                        <div className="mt-3 flex items-center space-x-4">
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
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">
                        Modify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Favourite Rooms */}
            <div className="bg-plek-dark rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BookMarked className="h-5 w-5 mr-2 text-purple-500" />
                Favourite Rooms
              </h2>
              <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {[
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
                ].map((room, index) => (
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
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">
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
import React, { useState } from 'react';
import { Search, SlidersHorizontal, Projector, Wifi, ArrowLeft, Calendar, Clock, Users, Building2, X } from 'lucide-react';
import { Link } from 'react-router-dom';



function Booking() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const firstName = localStorage.getItem('FirstName');

  const rooms = [
    {
      id: 1,
      name: 'B512',
      building: 'R&D Building',
      capacity: 100,
      timeSlot: '4 - 5 pm',
      date: '6th february 2025',
      amenities: ['projector', 'wifi']
    },
    {
      id: 2,
      name: 'B512',
      building: 'R&D Building',
      capacity: 100,
      timeSlot: '4 - 5 pm',
      date: '6th february 2025',
      amenities: ['projector', 'wifi']
    }
  ];

  const handleBookClick = (room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const toggleAmenity = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
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
                  <p>{room.name} - {room.building}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Calendar size={20} />
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p>{room.date}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300">
                <Clock size={20} />
                <div>
                  <p className="text-sm text-gray-400">Time Slot</p>
                  <p>{room.timeSlot}</p>
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
              {room.amenities.includes('projector') && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Projector size={18} />
                  <span>Projector</span>
                </div>
              )}
              {room.amenities.includes('wifi') && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Wifi size={18} />
                  <span>Wi-Fi</span>
                </div>
              )}
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

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <div className="min-h-screen bg-plek-background text-white">
          {/* Navigation */}
          <nav className="border-b border-gray-800 px-6 py-4 bg-plek-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="flex items-center">
                  <span className="ml-2 text-xl font-semibold">Plek</span>
                </div>
                <div className="flex space-x-6">
                  <a href="Dashboard" className="text-gray-400 hover:text-gray-300">Dashboard</a>
                  <a href="Booking" className="text-purple-400 hover:text-purple-300">Book a room</a>
                  <a href="MyBookings" className="text-gray-400 hover:text-gray-300">My Bookings</a>
                  <a href="ManageBookings" className="text-gray-400 hover:text-gray-300">Manage Bookings</a>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-400 rounded-full"></div>
                <span>{firstName}</span>
                
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 py-8">
            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                placeholder="Search for rooms..."
                className="w-full pl-12 pr-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <SlidersHorizontal className="text-gray-300" />
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-gray-300">Building</label>
                <select className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option>Any Buildings</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-gray-300">Time Slot</label>
                <select className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option>All Time Slots</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-gray-300">Capacity</label>
                <select className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option>Any Capacity</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-gray-300">Amenities</label>
                <div className="flex space-x-2">
                  <button
                    className={`px-4 py-2 ${selectedAmenities.includes('projector') ? 'bg-purple-600' : 'bg-gray-600'} rounded-lg flex items-center space-x-2`}
                    onClick={() => toggleAmenity('projector')}
                  >
                    <Projector size={18} />
                    <span>Projector</span>
                  </button>
                  <button
                    className={`px-4 py-2 ${selectedAmenities.includes('wifi') ? 'bg-purple-600' : 'bg-gray-600'} rounded-lg flex items-center space-x-2`}
                    onClick={() => toggleAmenity('wifi')}
                  >
                    <Wifi size={18} />
                    <span>Wi-Fi</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Room Cards */}
            <div className="grid grid-cols-3 gap-6">
              {rooms.map(room => (
                <div key={room.id} className="bg-plek-dark rounded-lg p-6 space-y-4">
                  <h3 className="text-xl font-semibold">Room: {room.name}</h3>
                  <p>Building: {room.building}</p>
                  <p>Capacity: {room.capacity}</p>
                  <p>Slot: {room.timeSlot}</p>
                  <p>Date: {room.date}</p>
                  <div className="flex space-x-2">
                    {room.amenities.includes('projector') && (
                      <Projector size={18} className="text-gray-400" />
                    )}
                    {room.amenities.includes('wifi') && (
                      <Wifi size={18} className="text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => handleBookClick(room)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Book
                  </button>
                </div>
              ))}
            </div>
          </main>
        </div>
      </main>

      <footer className="border-t border-gray-800 bg-plek-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link to="/about" className="hover:text-white transition-colors">About us</Link>
            <Link to="/help" className="hover:text-white transition-colors">Help Center</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact us</Link>
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
    </div>
  );
}

export default Booking;
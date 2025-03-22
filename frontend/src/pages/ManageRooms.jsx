import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Projector, Wifi, Building2, X, Plus, Pencil, Trash2, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

function ManageRooms() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedCapacity, setSelectedCapacity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const firstName = localStorage.getItem('FirstName');

  const rooms = [
    {
      id: 1,
      name: 'B512',
      building: 'R&D Building',
      capacity: 100,
      amenities: ['projector', 'wifi', 'whiteboard']
    },
    {
      id: 2,
      name: 'A204',
      building: 'R&D Building',
      capacity: 50,
      amenities: ['wifi', 'whiteboard']
    },
    {
      id: 3,
      name: 'C101',
      building: 'Main Building',
      capacity: 30,
      amenities: ['projector', 'wifi']
    },
    {
      id: 4,
      name: 'D405',
      building: 'Conference Center',
      capacity: 200,
      amenities: ['projector', 'wifi', 'whiteboard']
    }
  ];

  // Get unique buildings and capacity ranges
  const buildings = useMemo(() => 
    ['all', ...new Set(rooms.map(room => room.building))],
    [rooms]
  );

  const capacityRanges = [
    { label: 'All', value: 'all' },
    { label: '1-50', value: '1-50', min: 1, max: 50 },
    { label: '51-100', value: '51-100', min: 51, max: 100 },
    { label: '101-200', value: '101-200', min: 101, max: 200 },
    { label: '200+', value: '200+', min: 200, max: Infinity }
  ];

  // Filter rooms based on search query and filters
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.building.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBuilding = 
        selectedBuilding === 'all' || room.building === selectedBuilding;
      
      const matchesCapacity = selectedCapacity === 'all' || 
        capacityRanges.find(range => 
          range.value === selectedCapacity && 
          room.capacity >= range.min && 
          room.capacity <= range.max
        );

      return matchesSearch && matchesBuilding && matchesCapacity;
    });
  }, [rooms, searchQuery, selectedBuilding, selectedCapacity]);

  const handleEditClick = (room) => {
    setSelectedRoom(room);
    setShowEditModal(true);
  };

  const handleDeleteClick = (roomId) => {
    if (confirm('Are you sure you want to delete this room?')) {
      // Handle room deletion logic
      console.log('Deleting room:', roomId);
    }
  };

  const RoomModal = ({ room, onClose, isEdit }) => {
    const [name, setName] = useState(room ? room.name : '');
    const [building, setBuilding] = useState(room ? room.building : '');
    const [capacity, setCapacity] = useState(room ? room.capacity : '');
    const [amenities, setAmenities] = useState(room ? room.amenities : []);

    const toggleAmenity = (amenity) => {
      if (amenities.includes(amenity)) {
        setAmenities(amenities.filter(a => a !== amenity));
      } else {
        setAmenities([...amenities, amenity]);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      // Handle room creation/update logic
      const roomData = {
        name,
        building,
        capacity: parseInt(capacity),
        amenities
      };
      console.log(isEdit ? 'Updating room:' : 'Creating room:', roomData);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl w-full max-w-2xl p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {isEdit ? 'Edit Room' : 'Add New Room'}
            </h2>
            <p className="text-gray-400">
              {isEdit ? 'Update the room details' : 'Enter the details for the new room'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g., B512"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Building
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g., R&D Building"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Capacity
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter room capacity"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amenities
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  className={`px-4 py-2 ${amenities.includes('projector') ? 'bg-purple-600' : 'bg-gray-600'} rounded-lg flex items-center space-x-2`}
                  onClick={() => toggleAmenity('projector')}
                >
                  <Projector size={18} />
                  <span>Projector</span>
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 ${amenities.includes('wifi') ? 'bg-purple-600' : 'bg-gray-600'} rounded-lg flex items-center space-x-2`}
                  onClick={() => toggleAmenity('wifi')}
                >
                  <Wifi size={18} />
                  <span>Wi-Fi</span>
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 ${amenities.includes('whiteboard') ? 'bg-purple-600' : 'bg-gray-600'} rounded-lg flex items-center space-x-2`}
                  onClick={() => toggleAmenity('whiteboard')}
                >
                  <Square size={18} />
                  <span>Whiteboard</span>
                </button>
              </div>
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
                {isEdit ? 'Save Changes' : 'Add Room'}
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
                  <a href="/dashboard" className="text-gray-400 hover:text-gray-300">Dashboard</a>
                  <a href="/booking" className="text-gray-400 hover:text-gray-300">Book a room</a>
                  <a href="/MyBookings" className="text-gray-400 hover:text-gray-300">My Bookings</a>
                  <a href="/ManageBookings" className="text-gray-400 hover:text-gray-300">Manage Bookings</a>
                  <a href="/ManageRooms" className="text-purple-400 hover:text-purple-300">Manage Rooms</a>
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
            {/* Header with Add Room button */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold">Manage Rooms</h1>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Room</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4 mb-8">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  className="w-full pl-12 pr-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className={`text-gray-300 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Building
                    </label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {buildings.map((building) => (
                        <option key={building} value={building}>
                          {building === 'all' ? 'All Buildings' : building}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Capacity
                    </label>
                    <select
                      value={selectedCapacity}
                      onChange={(e) => setSelectedCapacity(e.target.value)}
                      className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {capacityRanges.map((range) => (
                        <option key={range.value} value={range.value}>
                          {range.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Room Cards */}
            <div className="grid grid-cols-3 gap-6">
              {filteredRooms.map(room => (
                <div key={room.id} className="bg-plek-dark rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold">Room: {room.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(room)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Pencil size={18} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(room.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p>Building: {room.building}</p>
                  <p>Capacity: {room.capacity}</p>
                  <div className="flex space-x-2">
                    {room.amenities.includes('projector') && (
                      <Projector size={18} className="text-gray-400" />
                    )}
                    {room.amenities.includes('wifi') && (
                      <Wifi size={18} className="text-gray-400" />
                    )}
                    {room.amenities.includes('whiteboard') && (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </div>
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

      {/* Add Room Modal */}
      {showAddModal && (
        <RoomModal
          onClose={() => setShowAddModal(false)}
          isEdit={false}
        />
      )}

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <RoomModal
          room={selectedRoom}
          onClose={() => setShowEditModal(false)}
          isEdit={true}
        />
      )}
    </div>
  );
}

export default ManageRooms;
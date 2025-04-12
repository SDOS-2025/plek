import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Projector,
  Wifi,
  Square,
  Building2,
  X,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import BookingModal from "../components/ConfirmBooking";
import api from "../api";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

function Booking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const firstName = localStorage.getItem("FirstName");

  // Modify the useEffect hook to refresh data every minute
  useEffect(() => {
    // Create a reference to track if component is mounted
    let isMounted = true;

    const fetchRooms = async () => {
      // Only proceed if component is still mounted
      if (!isMounted) return;

      try {
        setLoading((prevLoading) => {
          // Only show loading indicator on first load, not refreshes
          return prevLoading && rooms.length === 0;
        });

        const response = await api.get("rooms/");

        if (isMounted) {
          setRooms(response.data);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
        if (isMounted) {
          setError("Failed to load available rooms");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchRooms();

    // Set up interval for fetching every minute (60000 milliseconds)
    const intervalId = setInterval(() => {
      console.log("Refreshing room data...");
      fetchRooms();
    }, 60000);

    // Cleanup function to run when component unmounts
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array means this runs once on mount

  const buildings = ["all", ...new Set(rooms.map((room) => room.building))];

  const capacityRanges = [
    { label: "All", value: "all" },
    { label: "1-50", value: "1-50", min: 1, max: 50 },
    { label: "51-100", value: "51-100", min: 51, max: 100 },
    { label: "101-200", value: "101-200", min: 101, max: 200 },
    { label: "200+", value: "200+", min: 200, max: Infinity },
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

  // Filter rooms based on search query, building, capacity, and amenities
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.building.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBuilding =
      selectedBuilding === "all" || room.building === selectedBuilding;

    const matchesCapacity =
      selectedCapacity === "all" ||
      capacityRanges.find(
        (range) =>
          range.value === selectedCapacity &&
          room.capacity >= range.min &&
          room.capacity <= range.max
      );

    const matchesAmenities =
      selectedAmenities.length === 0 ||
      selectedAmenities.every((amenity) => room.amenities.includes(amenity));

    return (
      matchesSearch &&
      matchesBuilding &&
      matchesCapacity &&
      matchesAmenities
    );
  });

  return (
    <div className="page-container">
      <NavBar activePage="booking" />

      <div className="main-content">
        {/* Search Bar */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search for rooms..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-700 rounded-lg">
              <div className="space-y-2">
                <label className="block text-gray-300">Building</label>
                <select
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  {buildings.map((building) => (
                    <option key={building} value={building}>
                      {building === "all" ? "Any Building" : building}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-gray-300">Capacity</label>
                <select
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(e.target.value)}
                >
                  {capacityRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`px-4 py-2 ${
                      selectedAmenities.includes("projector")
                        ? "bg-plek-purple"
                        : "bg-gray-600"
                    } rounded-lg flex items-center space-x-2`}
                    onClick={() => toggleAmenity("projector")}
                  >
                    <Projector size={18} />
                    <span>Projector</span>
                  </button>
                  <button
                    className={`px-4 py-2 ${
                      selectedAmenities.includes("wifi")
                        ? "bg-plek-purple"
                        : "bg-gray-600"
                    } rounded-lg flex items-center space-x-2`}
                    onClick={() => toggleAmenity("wifi")}
                  >
                    <Wifi size={18} />
                    <span>Wi-Fi</span>
                  </button>
                  <button
                    className={`px-4 py-2 ${
                      selectedAmenities.includes("whiteboard")
                        ? "bg-plek-purple"
                        : "bg-gray-600"
                    } rounded-lg flex items-center space-x-2`}
                    onClick={() => toggleAmenity("whiteboard")}
                  >
                    <Square size={18} />
                    <span>Whiteboard</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Room Cards */}
        <div className="grid-layout-3">
          {loading ? (
            <div className="col-span-3 text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-4 text-gray-300">Loading rooms...</p>
            </div>
          ) : error ? (
            <div className="col-span-3 text-center py-10">
              <div className="text-red-400 text-xl mb-2">⚠️</div>
              <p className="text-gray-300">{error}</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="col-span-3 text-center py-10">
              <p className="text-gray-300">No rooms match your search criteria.</p>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <div key={room.id} className="section-card">
                <h3 className="text-xl font-semibold">{room.name}</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-300">{room.building}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-300">Capacity: {room.capacity}</span>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    {room.amenities?.includes("projector") && (
                      <Projector size={18} className="text-gray-400" />
                    )}
                    {room.amenities?.includes("wifi") && (
                      <Wifi size={18} className="text-gray-400" />
                    )}
                    {room.amenities?.includes("whiteboard") && (
                      <Square size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleBookClick(room)}
                  className="w-full py-2 bg-plek-purple hover:bg-purple-700 rounded-lg transition-colors mt-4"
                >
                  Book
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />

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

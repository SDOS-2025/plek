import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Building2,
  X,
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import BookingModal from "../../components/ConfirmBooking";
import api from "../../api";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";

// Utility function to properly capitalize amenity names
const formatAmenityName = (name) => {
  if (!name) return "";

  // Handle special cases like "TV", "WiFi", etc.
  const specialCases = {
    wifi: "WiFi",
    tv: "TV",
    hdmi: "HDMI",
    usb: "USB",
    ac: "AC",
  };

  const lowerName = name.toLowerCase();
  if (specialCases[lowerName]) {
    return specialCases[lowerName];
  }

  // Otherwise capitalize first letter of each word
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

function Booking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [availableAmenities, setAvailableAmenities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all required data for filtering (rooms, floors, departments, amenities)
  useEffect(() => {
    // Create a reference to track if component is mounted
    let isMounted = true;

    const fetchData = async () => {
      // Only proceed if component is still mounted
      if (!isMounted) return;

      try {
        setLoading(true);

        // Fetch all required data in parallel
        const [
          roomsResponse,
          floorsResponse,
          departmentsResponse,
          amenitiesResponse,
        ] = await Promise.all([
          api.get("rooms/?view_all=true"), // Added view_all=true parameter
          api.get("floors/"),
          api.get("departments/"),
          api.get("amenities/"),
        ]);

        if (isMounted) {
          // Set all data to state
          setRooms(roomsResponse.data);
          setFloors(floorsResponse.data);
          setDepartments(departmentsResponse.data);

          // Process amenities to create a consistent format for filtering
          const amenities = amenitiesResponse.data.map((amenity) => ({
            id: amenity.id,
            name: amenity.name,
            value: amenity.name.toLowerCase(),
          }));
          setAvailableAmenities(amenities);

          setError(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (isMounted) {
          setError("Failed to load available rooms and filters");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for refreshing room data every minute (60000 milliseconds)
    const intervalId = setInterval(() => {
      console.log("Refreshing room data...");
      api
        .get("rooms/?view_all=true") // Added view_all=true parameter
        .then((response) => {
          if (isMounted) {
            setRooms(response.data);
          }
        })
        .catch((err) => {
          console.error("Error refreshing rooms:", err);
        });
    }, 60000);

    // Cleanup function to run when component unmounts
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array means this runs once on mount

  // Use building_name for dropdown instead of just building field
  const buildings = useMemo(() => {
    // Start with "all" option
    let buildingOptions = ["all"];

    // Extract unique building names from rooms, preferring building_name field
    const uniqueBuildings = new Set(
      rooms
        .filter((room) => room.building_name) // Only include rooms with building_name
        .map((room) => room.building_name)
    );

    // Convert Set back to array and return
    return [...buildingOptions, ...uniqueBuildings];
  }, [rooms]);

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
    // Only show active rooms
    const isActive = room.is_active !== false;

    // Search functionality - match room name, building, floor name, or amenities
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      room.name.toLowerCase().includes(searchLower) ||
      (room.building &&
        typeof room.building === "string" &&
        room.building.toLowerCase().includes(searchLower)) ||
      (room.floor_name &&
        room.floor_name.toLowerCase().includes(searchLower)) ||
      (room.amenity_names &&
        Array.isArray(room.amenity_names) &&
        room.amenity_names.some((amenity) =>
          amenity.toLowerCase().includes(searchLower)
        ));

    // Building filter
    const matchesBuilding =
      selectedBuilding === "all" || room.building_name === selectedBuilding;

    // Floor filter
    const matchesFloor =
      selectedFloor === "all" ||
      (room.floor && room.floor.toString() === selectedFloor) ||
      (room.floor_id && room.floor_id.toString() === selectedFloor);

    // Department filter
    const matchesDepartment =
      selectedDepartment === "all" ||
      (room.departments &&
        Array.isArray(room.departments) &&
        room.departments.includes(parseInt(selectedDepartment))) ||
      (room.department_ids &&
        Array.isArray(room.department_ids) &&
        room.department_ids.includes(parseInt(selectedDepartment)));

    // Capacity filter
    const matchesCapacity =
      selectedCapacity === "all" ||
      capacityRanges.find(
        (range) =>
          range.value === selectedCapacity &&
          room.capacity >= range.min &&
          room.capacity <= range.max
      );

    // Amenities filter - check if room has all selected amenities
    const matchesAmenities =
      selectedAmenities.length === 0 ||
      (room.amenity_names &&
        Array.isArray(room.amenity_names) &&
        selectedAmenities.every((selectedAmenity) => {
          return room.amenity_names.some(
            (roomAmenity) =>
              roomAmenity.toLowerCase() === selectedAmenity.toLowerCase()
          );
        }));

    return (
      isActive &&
      matchesSearch &&
      matchesBuilding &&
      matchesFloor &&
      matchesDepartment &&
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

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
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

              {/* Floor Filter */}
              <div className="space-y-2">
                <label className="block text-gray-300">Floor</label>
                <select
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                >
                  <option value="all">Any Floor</option>
                  {floors
                    .filter(
                      (floor) =>
                        selectedBuilding === "all" ||
                        floor.building_name === selectedBuilding
                    )
                    .map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.name || `Floor ${floor.number}`}
                      </option>
                    ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="block text-gray-300">Department</label>
                <select
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">Any Department</option>
                  {departments
                    .filter((dept) => dept.is_active !== false)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}{" "}
                        {department.code ? `(${department.code})` : ""}
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

              {/* Reset Button */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedBuilding("all");
                    setSelectedFloor("all");
                    setSelectedDepartment("all");
                    setSelectedCapacity("all");
                    setSelectedAmenities([]);
                    setSearchQuery("");
                  }}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
                >
                  Reset Filters
                </button>
              </div>

              {/* Dynamic Amenities Section */}
              <div className="lg:col-span-3">
                <label className="block text-gray-300 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {availableAmenities.map((amenity) => (
                    <button
                      key={amenity.id}
                      className={`px-4 py-2 ${
                        selectedAmenities.includes(amenity.value)
                          ? "bg-plek-purple"
                          : "bg-gray-600"
                      } rounded-lg flex items-center space-x-2 transition-colors`}
                      onClick={() => toggleAmenity(amenity.value)}
                    >
                      <span>{formatAmenityName(amenity.name)}</span>
                    </button>
                  ))}
                  {availableAmenities.length === 0 && (
                    <span className="text-gray-400 text-sm">
                      No amenities available
                    </span>
                  )}
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
              <p className="text-gray-300">
                No rooms match your search criteria.
              </p>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <div
                key={room.id}
                className="section-card overflow-hidden group hover:shadow-lg hover:shadow-purple-900/20 transition-all duration-300"
              >
                {/* Card header with room name */}
                <div className="pb-3 border-b border-gray-700/50">
                  <h3 className="text-xl font-semibold text-white">
                    {room.name}
                  </h3>
                </div>

                {/* Room details - more compact layout */}
                <div className="py-3">
                  {/* Info section */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-purple-400 mr-2" />
                      <span className="text-sm text-gray-300">
                        {room.building_name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-purple-400 mr-2" />
                      <span className="text-sm text-gray-300">
                        {room.capacity}
                      </span>
                    </div>
                  </div>

                  {/* Amenities tags with new elegant style */}
                  {room.amenity_names && room.amenity_names.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {room.amenity_names.map((amenityName, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-800/60 text-gray-200 text-sm flex items-center hover:bg-gray-700/60 transition-colors shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-sm bg-purple-500 mr-1.5"></span>
                          {formatAmenityName(amenityName)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Book button */}
                  <button
                    onClick={() => handleBookClick(room)}
                    className="w-full py-2 bg-plek-purple hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <span className="font-medium">Book</span>
                  </button>
                </div>
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

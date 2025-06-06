import React, {
  useState,
  useMemo,
  useEffect,
  useContext,
  useCallback,
} from "react";
import PropTypes from "prop-types";
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
import api from "../../api"; // Adjust the import path as needed
import { AuthContext } from "../../context/AuthProvider";
import Toast, { DeleteConfirmation } from "../../components/AlertToast";
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

function ManageRooms() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [rooms, setRooms] = useState([]); // Initialize with an empty array
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    type: "success", // 'success', 'danger', or 'warning'
    message: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [floors, setFloors] = useState([]);
  const [departments, setDepartments] = useState([]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  // Define fetchRooms function outside useEffect so it can be accessed globally in the component
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await api.get("rooms/");
      setRooms(response.data);
      setError(null);
    } catch (error) {
      setError("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  // Define startPolling function outside useEffect so it can be accessed globally in the component
  const startPolling = () => {
    fetchRooms(); // Initial fetch
    return setInterval(fetchRooms, 60000); // Every minute
  };

  // Define stopPolling function to clear the interval
  const stopPolling = (intervalId) => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    if (!showAddModal && !showEditModal) {
      intervalId = startPolling();
    }

    // This is the cleanup function
    return () => {
      isMounted = false;
      stopPolling(intervalId);
    };
  }, [showAddModal, showEditModal]); // Fetch rooms on component mount

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [floorsResponse, departmentsResponse] = await Promise.all([
          api.get("/floors/"),
          api.get("/departments/"),
        ]);

        setFloors(floorsResponse.data);
        setDepartments(departmentsResponse.data);
      } catch (error) {
        console.error("Error fetching filter data:", error);
      }
    };

    fetchFilterData();
  }, []);

  {
    error && (
      <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
        {error}
      </div>
    );
  }

  // Adding debugging utility to help track departments in each room
  useEffect(() => {
    if (selectedDepartment !== "all") {
      console.log("Selected Department:", selectedDepartment);
      rooms.forEach((room) => {
        if (room.department_names) {
          console.log(`Room ${room.name} departments:`, room.department_names);
        }
      });
    }
  }, [selectedDepartment, rooms]);

  // Get unique buildings and capacity ranges
  const buildings = useMemo(() => {
    const buildingSet = new Set();
    // Add "all" option first
    buildingSet.add("all");

    // Add building names from rooms
    rooms.forEach((room) => {
      // Prefer building_name if available, fall back to building if it's a string
      if (room.building_name) {
        buildingSet.add(room.building_name);
      } else if (typeof room.building === "string" && room.building !== "all") {
        buildingSet.add(room.building);
      }
    });

    return Array.from(buildingSet);
  }, [rooms]);

  const capacityRanges = useMemo(
    () => [
      { label: "All", value: "all" },
      { label: "1-50", value: "1-50", min: 1, max: 50 },
      { label: "51-100", value: "51-100", min: 51, max: 100 },
      { label: "101-200", value: "101-200", min: 101, max: 200 },
      { label: "200+", value: "200+", min: 200, max: Infinity },
    ],
    []
  );

  const uniqueFloors = useMemo(() => {
    const floorNames = ["all"];
    rooms.forEach((room) => {
      if (room.floor_name && !floorNames.includes(room.floor_name)) {
        floorNames.push(room.floor_name);
      }
    });
    return floorNames;
  }, [rooms]);

  // Improved department list with both IDs and names for better filtering
  const uniqueDepartments = useMemo(() => {
    // Start with "all" option
    const options = [{ id: "all", name: "All Departments" }];

    // Add departments from API with their IDs for reference
    departments
      .filter((dept) => dept.is_active !== false)
      .forEach((dept) => {
        options.push({
          id: dept.id,
          name: dept.name,
        });
      });

    return options;
  }, [departments]);

  // Filter rooms based on search query and filters
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Search functionality - check if the search query matches room name, building, floor name, or any amenity
      const roomNameMatch =
        typeof room.name === "string"
          ? room.name.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

      const buildingMatch =
        typeof room.building === "string"
          ? room.building.toLowerCase().includes(searchQuery.toLowerCase())
          : room.building && room.building.toString
          ? room.building
              .toString()
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : false;

      const floorMatch =
        room.floor_name && typeof room.floor_name === "string"
          ? room.floor_name.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

      // Check if search matches any of the room's amenities
      const amenityMatch =
        room.amenity_names &&
        Array.isArray(room.amenity_names) &&
        room.amenity_names.some(
          (amenity) =>
            typeof amenity === "string" &&
            amenity.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const departmentMatch =
        room.department_names &&
        Array.isArray(room.department_names) &&
        room.department_names.some(
          (dept) =>
            typeof dept === "string" &&
            dept.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesSearch =
        roomNameMatch ||
        buildingMatch ||
        floorMatch ||
        amenityMatch ||
        departmentMatch;

      // Filter by building
      const matchesBuilding =
        selectedBuilding === "all" ||
        room.building === selectedBuilding ||
        (room.building_name && room.building_name === selectedBuilding);

      // Filter by floor
      const matchesFloor =
        selectedFloor === "all" ||
        (room.floor_name && room.floor_name === selectedFloor);

      // Filter by department - match by ID or name
      const matchesDepartment =
        selectedDepartment === "all" ||
        // Try to match against department IDs first (integers)
        (room.departments &&
          Array.isArray(room.departments) &&
          room.departments.some(
            (deptId) => deptId.toString() === selectedDepartment.toString()
          )) ||
        // Then try to match against department names (strings)
        (room.department_names &&
          Array.isArray(room.department_names) &&
          room.department_names.includes(
            // Find the name corresponding to the selected ID
            departments.find(
              (dept) => dept.id.toString() === selectedDepartment.toString()
            )?.name
          ));

      // Filter by capacity
      const matchesCapacity =
        selectedCapacity === "all" ||
        capacityRanges.find(
          (range) =>
            range.value === selectedCapacity &&
            room.capacity >= range.min &&
            room.capacity <= range.max
        );

      // Filter by availability
      const matchesAvailability =
        selectedAvailability === "all" ||
        (selectedAvailability === "available" && room.is_active !== false) ||
        (selectedAvailability === "unavailable" && room.is_active === false);

      return (
        matchesSearch &&
        matchesBuilding &&
        matchesFloor &&
        matchesDepartment &&
        matchesCapacity &&
        matchesAvailability
      );
    });
  }, [
    rooms,
    searchQuery,
    selectedBuilding,
    selectedFloor,
    selectedDepartment,
    selectedCapacity,
    selectedAvailability,
    capacityRanges,
    departments,
  ]);

  const handleEditClick = useCallback((room) => {
    setSelectedRoom(room);
    setShowEditModal(true);
  }, []);

  const handleDeleteClick = useCallback((roomId) => {
    setRoomToDelete(roomId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = async () => {
    if (roomToDelete) {
      try {
        console.log("Deleting room:", roomToDelete);
        const response = await api.delete(`rooms/${roomToDelete}/`);
        console.log("response:", response.data);
        showAlert("success", "Room deleted successfully!");

        // Refresh the rooms list
        const updatedRooms = await api.get("rooms/");
        setRooms(updatedRooms.data);
      } catch (error) {
        console.error("Error deleting room:", error);
        showAlert("danger", "Failed to delete room");
      } finally {
        setShowDeleteConfirm(false);
        setRoomToDelete(null);
      }
    }
  };

  const RoomModal = React.memo(({ room, onClose, isEdit, setRooms }) => {
    const [name, setName] = useState(room ? room.name : "");
    const [buildingId, setBuildingId] = useState(room ? room.building : "");
    const [floorId, setFloorId] = useState(room ? room.floor : "");
    const [capacity, setCapacity] = useState(room ? room.capacity : "");
    const [amenityIds, setAmenityIds] = useState(room ? room.amenities : []);
    const [departmentIds, setDepartmentIds] = useState(
      room ? room.departments || [] : []
    );
    const [isActive, setIsActive] = useState(
      room ? room.is_active !== false : true
    );

    // Add new state variables for data fetching
    const [buildingsList, setBuildingsList] = useState([]);
    const [floorsList, setFloorsList] = useState([]);
    const [amenitiesList, setAmenitiesList] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Fetch required data on component mount
    useEffect(() => {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          // Fetch buildings
          const buildingsResponse = await api.get("/buildings/");
          setBuildingsList(buildingsResponse.data);

          // Set initial building ID if editing
          if (isEdit && room) {
            setBuildingId(room.building);
          } else if (buildingsResponse.data.length > 0) {
            // Default to first building for new rooms
            setBuildingId(buildingsResponse.data[0].id);
          }

          // Fetch amenities
          const amenitiesResponse = await api.get("/amenities/");
          setAmenitiesList(amenitiesResponse.data);

          // Fetch departments
          const departmentsResponse = await api.get("/departments/");
          setDepartmentsList(departmentsResponse.data);

          // Set initial amenity IDs if editing
          if (isEdit && room && Array.isArray(room.amenities)) {
            // Map string amenities to their IDs
            const amenityMapping = {};
            amenitiesResponse.data.forEach((a) => {
              amenityMapping[a.name.toLowerCase()] = a.id;
            });

            const mappedIds = room.amenities
              .map((name) => amenityMapping[name.toLowerCase()])
              .filter((id) => id !== undefined);

            setAmenityIds(mappedIds);
          }

          // Set initial department IDs if editing
          if (isEdit && room && Array.isArray(room.departments)) {
            setDepartmentIds(room.departments);
          }

          setFetchError(null);
        } catch (error) {
          console.error("Error fetching data:", error);
          setFetchError("Failed to load required data. Please try again.");
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }, [isEdit, room]);

    // Fetch floors when building ID changes
    useEffect(() => {
      if (!buildingId) return;

      const fetchFloors = async () => {
        try {
          const floorsResponse = await api.get(
            `/buildings/${buildingId}/floors/`
          );
          setFloorsList(floorsResponse.data);

          // Set initial floor if available, or default to first floor
          if (isEdit && room) {
            setFloorId(room.floor);
          } else if (floorsResponse.data.length > 0) {
            setFloorId(floorsResponse.data[0].id);
          }
        } catch (error) {
          console.error("Error fetching floors:", error);
        }
      };

      fetchFloors();
    }, [buildingId, isEdit, room]);

    const toggleAmenity = (amenityId) => {
      if (amenityIds.includes(amenityId)) {
        setAmenityIds(amenityIds.filter((id) => id !== amenityId));
      } else {
        setAmenityIds([...amenityIds, amenityId]);
      }
    };

    const toggleDepartment = (departmentId) => {
      if (departmentIds.includes(departmentId)) {
        setDepartmentIds(departmentIds.filter((id) => id !== departmentId));
      } else {
        setDepartmentIds([...departmentIds, departmentId]);
      }
    };

    useEffect(() => {
      console.log("Modal state initialized:", {
        name,
        buildingId,
        floorId,
        capacity,
        amenityIds,
        departmentIds,
      });
    }, [name, buildingId, floorId, capacity, amenityIds, departmentIds]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      // Handle room creation/update logic
      const roomData = {
        name,
        building: buildingId,
        floor: floorId,
        capacity: parseInt(capacity),
        amenities: amenityIds,
        departments: departmentIds,
        is_active: isActive,
      };
      try {
        if (isEdit && room) {
          await api.patch(`rooms/${room.id}/`, roomData);
          showAlert("success", "Room updated successfully!");
        } else {
          await api.post("rooms/create/", roomData);
          showAlert("success", "Room created successfully!");
        }
        // Fetch updated rooms
        const response = await api.get("rooms/");
        setRooms(response.data);
        setError(null);
      } catch (err) {
        const errorMessage =
          err.response?.data?.name?.[0] ||
          "An error occurred while saving the room.";
        showAlert("danger", errorMessage);
        console.error("Error:", err.response?.data || err.message);
      }
      onClose();
    };

    return (
      <div className="modal-container">
        <div className="modal-content">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>

          <div className="modal-header">
            <h2 className="modal-title">
              {isEdit ? "Edit Room" : "Add New Room"}
            </h2>
            <p className="modal-subtitle">
              {isEdit
                ? "Update the room details"
                : "Enter the details for the new room"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid-layout-2 mb-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Building2 size={20} />
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Room Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple"
                      placeholder="e.g., B512"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Users size={20} />
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple"
                      placeholder="Enter room capacity"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Building
              </label>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple"
                required
              >
                {buildingsList.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Floor
              </label>
              <select
                value={floorId}
                onChange={(e) => setFloorId(e.target.value)}
                className="w-full bg-plek-background rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-plek-purple"
                required
              >
                {floorsList.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Departments section */}
            <div className="bg-plek-background rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Departments</h3>
              <div className="flex flex-wrap gap-2">
                {departmentsList.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    className={`px-3 py-2 ${
                      departmentIds.includes(department.id)
                        ? "bg-plek-purple"
                        : "bg-plek-lightgray"
                    } rounded-lg transition-colors`}
                    onClick={() => toggleDepartment(department.id)}
                  >
                    <span>{department.name}</span>
                    {department.code && (
                      <span className="ml-1 text-xs">({department.code})</span>
                    )}
                  </button>
                ))}
              </div>
              {departmentsList.length === 0 && (
                <p className="text-gray-400 text-sm">
                  No departments available
                </p>
              )}
            </div>

            {/* Amenities section with consistent styling */}
            <div className="bg-plek-background rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {amenitiesList.map((amenity) => (
                  <button
                    key={amenity.id}
                    type="button"
                    className={`px-3 py-2 ${
                      amenityIds.includes(amenity.id)
                        ? "bg-plek-purple"
                        : "bg-plek-lightgray"
                    } rounded-lg transition-colors`}
                    onClick={() => toggleAmenity(amenity.id)}
                  >
                    <span>{amenity.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Available status checkbox */}
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 text-plek-purple bg-plek-background border-gray-300 rounded focus:ring-plek-purple"
              />
              <label htmlFor="isActive" className="ml-2 text-gray-300">
                Available Room
              </label>
              <span className="ml-2 text-xs text-gray-400">
                (Unavailable rooms can't be booked)
              </span>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-plek-background hover:bg-plek-lightgray rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-plek-purple hover:bg-purple-700 rounded-lg transition-colors"
              >
                {isEdit ? "Save Changes" : "Add Room"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  });

  RoomModal.propTypes = {
    room: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      building: PropTypes.string,
      floor: PropTypes.string,
      capacity: PropTypes.number,
      amenities: PropTypes.arrayOf(PropTypes.string),
      departments: PropTypes.arrayOf(PropTypes.number),
    }),
    onClose: PropTypes.func.isRequired,
    isEdit: PropTypes.bool.isRequired,
    setRooms: PropTypes.func.isRequired,
  };

  RoomModal.displayName = "RoomModal";

  return (
    <div className="page-container">
      <NavBar activePage="manage-rooms" />

      <div className="main-content">
        {/* Header with Add Room button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Manage Rooms</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-plek-purple hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
              <Filter
                className={`text-gray-300 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
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
                      {building === "all" ? "All Buildings" : building}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Floor
                </label>
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {uniqueFloors.map((floor) => (
                    <option key={floor} value={floor}>
                      {floor === "all" ? "All Floors" : floor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {uniqueDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Availability
                </label>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">All Rooms</option>
                  <option value="available">Available Only</option>
                  <option value="unavailable">Unavailable Only</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedBuilding("all");
                    setSelectedFloor("all");
                    setSelectedDepartment("all");
                    setSelectedCapacity("all");
                    setSelectedAvailability("all");
                    setSearchQuery("");
                  }}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
                >
                  Reset Filters
                </button>
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
              <div key={room.id} className="section-card">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold">
                    {room.name}
                    {room.is_active === false && (
                      <span className="ml-2 text-sm px-2 py-0.5 bg-red-900/30 text-red-400 rounded-md">
                        Unavailable
                      </span>
                    )}
                  </h3>
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
                <div className="mt-3 space-y-2">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-purple-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      {room.building_name || room.building}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-purple-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      {room.capacity}
                    </span>
                  </div>
                  {room.amenity_names && room.amenity_names.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Add Room Modal */}
      {showAddModal && (
        <RoomModal
          onClose={() => {
            setShowAddModal(false);
            if (!showEditModal) startPolling();
          }}
          isEdit={false}
          setRooms={setRooms}
        />
      )}

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <RoomModal
          room={selectedRoom}
          onClose={() => {
            setShowEditModal(false);
            if (!showAddModal) startPolling();
          }}
          isEdit={true}
          setRooms={setRooms}
        />
      )}

      {/* Add this before the closing </div> of your return statement */}
      {alert.show && (
        <Toast
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onClose={hideAlert}
        />
      )}

      {/* Add the delete confirmation dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default ManageRooms;

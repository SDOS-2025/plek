import React, { useState, useMemo, useEffect, useContext, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Search,
  SlidersHorizontal,
  Projector,
  Wifi,
  Building2,
  X,
  Plus,
  Pencil,
  Trash2,
  Square,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api"; // Adjust the import path as needed
import { AuthContext } from "../context/AuthProvider";
import Toast, { DeleteConfirmation } from "../components/AlertToast";
import NavBar from "../components/NavBar";

function ManageRooms() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
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
  const firstName = user?.first_name || "User";

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    const fetchRooms = async () => {
      setLoading(true);
      try {
        const response = await api.get("rooms/");
        if (isMounted) {
          setRooms(response.data);
          setError(null);
        }
      } catch (error) {
        if (isMounted) {
          setError("Failed to fetch rooms");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const startPolling = () => {
      fetchRooms(); // Initial fetch
      intervalId = setInterval(fetchRooms, 6000); // Every minute
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };

    if (!showAddModal && !showEditModal) {
      startPolling();
    } else {
      stopPolling();
    }

    // This is the cleanup function
    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [showAddModal, showEditModal]); // Fetch rooms on component mount

  {
    error && (
      <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
        {error}
      </div>
    );
  }

  // Get unique buildings and capacity ranges
  const buildings = useMemo(
    () => ["all", ...new Set(rooms.map((room) => room.building))],
    [rooms]
  );

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

  // Filter rooms based on search query and filters
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
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

      return matchesSearch && matchesBuilding && matchesCapacity;
    });
  }, [rooms, searchQuery, selectedBuilding, selectedCapacity, capacityRanges]);

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
        const response = await api.delete(`rooms/delete/${roomToDelete}/`);
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
    const [building, setBuilding] = useState(room ? room.building : "");
    const [capacity, setCapacity] = useState(room ? room.capacity : "");
    const [amenities, setAmenities] = useState(room ? room.amenities : []);

    useEffect(() => {
      console.log("Modal state initialized:", {
        name,
        building,
        capacity,
        amenities,
      });
    }, [name, building, capacity, amenities]);

    const toggleAmenity = (amenity) => {
      if (amenities.includes(amenity)) {
        setAmenities(amenities.filter((a) => a !== amenity));
      } else {
        setAmenities([...amenities, amenity]);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // Handle room creation/update logic
      const roomData = {
        name,
        building,
        capacity: parseInt(capacity),
        amenities,
      };
      try {
        if (isEdit && room) {
          await api.patch(`rooms/${room.id}/`, roomData);
          showAlert("success", "Room updated successfully!");
        } else {
          await api.post("rooms/add/", roomData);
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
              {isEdit ? "Edit Room" : "Add New Room"}
            </h2>
            <p className="text-gray-400">
              {isEdit
                ? "Update the room details"
                : "Enter the details for the new room"}
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
                  className={`px-4 py-2 ${
                    amenities.includes("projector")
                      ? "bg-purple-600"
                      : "bg-gray-600"
                  } rounded-lg flex items-center space-x-2`}
                  onClick={() => toggleAmenity("projector")}
                >
                  <Projector size={18} />
                  <span>Projector</span>
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 ${
                    amenities.includes("wifi") ? "bg-purple-600" : "bg-gray-600"
                  } rounded-lg flex items-center space-x-2`}
                  onClick={() => toggleAmenity("wifi")}
                >
                  <Wifi size={18} />
                  <span>Wi-Fi</span>
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 ${
                    amenities.includes("whiteboard")
                      ? "bg-purple-600"
                      : "bg-gray-600"
                  } rounded-lg flex items-center space-x-2`}
                  onClick={() => toggleAmenity("whiteboard")}
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
      capacity: PropTypes.number,
      amenities: PropTypes.arrayOf(PropTypes.string),
    }),
    onClose: PropTypes.func.isRequired,
    isEdit: PropTypes.bool.isRequired,
    setRooms: PropTypes.func.isRequired,
  };

  RoomModal.displayName = "RoomModal";

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <div className="min-h-screen bg-plek-background text-white">
          {/* Navigation */}
          <NavBar activePage="manage-rooms" />

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
                  <SlidersHorizontal
                    className={`text-gray-300 transition-transform ${
                      showFilters ? "rotate-180" : ""
                    }`}
                  />
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
                          {building === "all" ? "All Buildings" : building}
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
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-plek-dark rounded-lg p-6 space-y-4"
                >
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
                    {room.amenities.includes("projector") && (
                      <Projector size={18} className="text-gray-400" />
                    )}
                    {room.amenities.includes("wifi") && (
                      <Wifi size={18} className="text-gray-400" />
                    )}
                    {room.amenities.includes("whiteboard") && (
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

import React, { useState, useEffect } from "react";
import {
  Search,
  Building2,
  Users,
  Package,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
  Layers,
} from "lucide-react";
import api from "../../api";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import Toast, { DeleteConfirmation } from "../../components/AlertToast";

function AdminManageConfig() {
  const [activeTab, setActiveTab] = useState("buildings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    type: "success", // 'success', 'danger', or 'warning'
    message: "",
  });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="page-container">
      <NavBar activePage="manage-config" />

      <div className="main-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Configuration Management
          </h1>
          <p className="text-gray-400">
            Manage buildings, departments, and amenities for your organization
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                activeTab === "buildings"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("buildings")}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Buildings
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                activeTab === "departments"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("departments")}
            >
              <Users className="mr-2 h-4 w-4" />
              Departments
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                activeTab === "amenities"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("amenities")}
            >
              <Package className="mr-2 h-4 w-4" />
              Amenities
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="section-card">
          {activeTab === "buildings" && <BuildingsTab showAlert={showAlert} />}
          {activeTab === "departments" && (
            <DepartmentsTab showAlert={showAlert} />
          )}
          {activeTab === "amenities" && <AmenitiesTab showAlert={showAlert} />}
        </div>
      </div>

      <Footer />

      {/* Alert Toast */}
      {alert.show && (
        <Toast
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onClose={hideAlert}
        />
      )}
    </div>
  );
}

// Buildings Tab Component
function BuildingsTab({ showAlert }) {
  const [buildings, setBuildings] = useState([]);
  const [floorCounts, setFloorCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    floorCount: 1,
  });
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState(null);

  // Fetch buildings and their floors
  const fetchFloorCounts = async (buildings) => {
    const floorData = {};
    for (const building of buildings) {
      try {
        const floorResponse = await api.get(`buildings/${building.id}/floors/`);
        floorData[building.id] = floorResponse.data.length;
      } catch (err) {
        console.error(
          `Error fetching floors for building ${building.id}:`,
          err
        );
        floorData[building.id] = 0;
      }
    }
    return floorData;
  };

  // Fetch buildings
  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const response = await api.get("buildings/");
      setBuildings(response.data);

      // Fetch floor information for each building
      const floorData = await fetchFloorCounts(response.data);
      setFloorCounts(floorData);
      setError(null);
    } catch (err) {
      console.error("Error fetching buildings:", err);
      setError("Failed to load buildings. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "floorCount" ? parseInt(value) || 0 : value,
    });
  };

  // Handle form submission for new building
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Create building
      const buildingResponse = await api.post("buildings/create/", {
        name: formData.name,
        location: formData.location,
        description: formData.description,
      });

      const buildingId = buildingResponse.data.id;
      const newBuilding = buildingResponse.data;

      // Create floors automatically
      for (
        let floorNumber = 1;
        floorNumber <= formData.floorCount;
        floorNumber++
      ) {
        await api.post("floors/create/", {
          number: floorNumber,
          name: `Floor ${floorNumber}`,
          building: buildingId,
        });
      }

      // Update local state with the new building and its floor count
      setBuildings([...buildings, newBuilding]);
      setFloorCounts({
        ...floorCounts,
        [buildingId]: formData.floorCount,
      });

      // Reset form
      setFormData({
        name: "",
        location: "",
        description: "",
        floorCount: 1,
      });
      setShowAddForm(false);
      showAlert("success", `Building "${formData.name}" created successfully!`);
    } catch (err) {
      console.error("Error creating building:", err);
      setError("Failed to create building. Please try again.");
      showAlert("danger", "Failed to create building. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle building deletion confirmation dialog
  const handleDeleteClick = (building) => {
    setBuildingToDelete(building);
    setShowDeleteConfirm(true);
  };

  // Handle building deletion
  const confirmDelete = async () => {
    if (!buildingToDelete) return;

    try {
      setLoading(true);
      await api.delete(`buildings/${buildingToDelete.id}/`);
      setBuildings(
        buildings.filter((building) => building.id !== buildingToDelete.id)
      );

      // Also update the floor counts
      const updatedFloorCounts = { ...floorCounts };
      delete updatedFloorCounts[buildingToDelete.id];
      setFloorCounts(updatedFloorCounts);

      showAlert(
        "success",
        `Building "${buildingToDelete.name}" deleted successfully!`
      );
    } catch (err) {
      console.error("Error deleting building:", err);
      setError("Failed to delete building. Please try again.");
      showAlert("danger", "Failed to delete building. Please try again.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setBuildingToDelete(null);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Update the building information
      await api.patch(`buildings/${editingBuilding.id}/`, {
        name: formData.name,
        location: formData.location,
        description: formData.description,
      });

      // Get current floor count for this building
      const currentFloorCount = floorCounts[editingBuilding.id] || 0;
      const newFloorCount = formData.floorCount;

      // If the floor count has changed, add or remove floors
      if (newFloorCount !== currentFloorCount) {
        if (newFloorCount > currentFloorCount) {
          // Add new floors
          for (
            let floorNumber = currentFloorCount + 1;
            floorNumber <= newFloorCount;
            floorNumber++
          ) {
            await api.post("floors/create/", {
              number: floorNumber,
              name: `Floor ${floorNumber}`,
              building: editingBuilding.id,
            });
          }
        } else if (newFloorCount < currentFloorCount) {
          // This would require fetching floors and deleting them
          // For simplicity, we're just showing a warning
          alert(
            `Note: To remove floors, please delete them manually from the building management interface.`
          );
        }

        // Update the floor count in our local state
        setFloorCounts({
          ...floorCounts,
          [editingBuilding.id]:
            newFloorCount > currentFloorCount
              ? newFloorCount
              : currentFloorCount,
        });
      }

      // Refresh buildings list
      await fetchBuildings();

      // Reset form and state
      setFormData({
        name: "",
        location: "",
        description: "",
        floorCount: 1,
      });
      setEditingBuilding(null);
      setShowEditForm(false);
      showAlert("success", `Building "${formData.name}" updated successfully!`);
    } catch (err) {
      console.error("Error updating building:", err);
      setError("Failed to update building. Please try again.");
      showAlert("danger", "Failed to update building. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start editing a building
  const startEditing = (building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      location: building.location || "",
      description: building.description || "",
      floorCount: floorCounts[building.id] || 0,
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingBuilding(null);
    setShowEditForm(false);
    setFormData({
      name: "",
      location: "",
      description: "",
      floorCount: 1,
    });
  };

  // Filter buildings based on search
  const filteredBuildings = buildings.filter(
    (building) =>
      building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (building.location &&
        building.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-1/2">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search buildings..."
            className="w-full pl-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowEditForm(false);
            setEditingBuilding(null);
            setFormData({
              name: "",
              location: "",
              description: "",
              floorCount: 1,
            });
          }}
        >
          {showAddForm ? <X className="mr-2" /> : <Plus className="mr-2" />}
          {showAddForm ? "Cancel" : "Add Building"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 p-6 rounded-lg mb-6"
        >
          <h3 className="text-xl font-semibold mb-4">Add New Building</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Building Name*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              Number of Floors*
            </label>
            <input
              type="number"
              name="floorCount"
              value={formData.floorCount}
              onChange={handleInputChange}
              min="1"
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              Floors will be automatically created
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center"
            >
              <X className="mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Save className="mr-2" />
              )}
              Create Building
            </button>
          </div>
        </form>
      )}

      {/* Edit Form - Separate block */}
      {showEditForm && editingBuilding && (
        <form
          onSubmit={handleEditSubmit}
          className="bg-gray-800 p-6 rounded-lg mb-6 border-l-4 border-blue-500"
        >
          <h3 className="text-xl font-semibold mb-4">
            Edit Building: {editingBuilding.name}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Building Name*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Number of Floors</label>
            <input
              type="number"
              name="floorCount"
              value={formData.floorCount}
              onChange={handleInputChange}
              min={floorCounts[editingBuilding.id] || 0}
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-sm text-gray-400 mt-1">
              You can only add floors, not remove them. Current floors:{" "}
              {floorCounts[editingBuilding.id] || 0}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={cancelEditing}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center"
            >
              <X className="mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Save className="mr-2" />
              )}
              Update Building
            </button>
          </div>
        </form>
      )}

      {/* Buildings List */}
      {loading && buildings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
          <p className="text-gray-400">Loading buildings...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
          <p>{error}</p>
        </div>
      ) : filteredBuildings.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p>No buildings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBuildings.map((building) => (
            <div
              key={building.id}
              className="bg-gray-800 p-4 rounded-lg flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-medium">{building.name}</h3>
                <div className="mt-1 flex items-center text-gray-400">
                  <Layers size={14} className="mr-1" />
                  <span>{floorCounts[building.id] || 0} Floors</span>
                </div>
                {building.location && (
                  <p className="text-gray-400 mt-1">{building.location}</p>
                )}
                {building.description && (
                  <p className="text-gray-300 mt-2">{building.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => startEditing(building)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(building)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Building"
        message={`Are you sure you want to delete ${buildingToDelete?.name}? This will also delete all associated floors and rooms.`}
      />
    </div>
  );
}

// Departments Tab Component
function DepartmentsTab({ showAlert }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    is_active: true,
  });
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await api.get("departments/");
        setDepartments(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching departments:", err);
        setError("Failed to load departments. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Handle form submission for new department
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("departments/create/", formData);

      // Refresh departments list
      const response = await api.get("departments/");
      setDepartments(response.data);

      // Reset form
      setFormData({
        name: "",
        description: "",
        code: "",
        is_active: true,
      });
      setShowAddForm(false);
      showAlert(
        "success",
        `Department "${formData.name}" created successfully!`
      );
    } catch (err) {
      console.error("Error creating department:", err);
      setError("Failed to create department. Please try again.");
      showAlert("danger", "Failed to create department. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle department deletion confirmation dialog
  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setShowDeleteConfirm(true);
  };

  // Handle department deletion
  const confirmDelete = async () => {
    if (!departmentToDelete) return;

    try {
      setLoading(true);
      await api.delete(`departments/${departmentToDelete.id}/`);
      setDepartments(
        departments.filter(
          (department) => department.id !== departmentToDelete.id
        )
      );

      showAlert(
        "success",
        `Department "${departmentToDelete.name}" deleted successfully!`
      );
    } catch (err) {
      console.error("Error deleting department:", err);
      setError("Failed to delete department. Please try again.");
      showAlert("danger", "Failed to delete department. Please try again.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDepartmentToDelete(null);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.patch(`departments/${editingDepartment.id}/`, formData);

      // Refresh departments list
      const response = await api.get("departments/");
      setDepartments(response.data);

      // Reset form
      setFormData({
        name: "",
        description: "",
        code: "",
        is_active: true,
      });
      setEditingDepartment(null);
      showAlert(
        "success",
        `Department "${formData.name}" updated successfully!`
      );
    } catch (err) {
      console.error("Error updating department:", err);
      setError("Failed to update department. Please try again.");
      showAlert("danger", "Failed to update department. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start editing a department
  const startEditing = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || "",
      code: department.code || "",
      is_active: department.is_active !== false, // Default to true if undefined
    });
    setShowAddForm(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingDepartment(null);
    setFormData({
      name: "",
      description: "",
      code: "",
      is_active: true,
    });
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter(
    (department) =>
      department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (department.code &&
        department.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-1/2">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search departments..."
            className="w-full pl-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingDepartment(null);
            setFormData({
              name: "",
              description: "",
              code: "",
              is_active: true,
            });
          }}
        >
          {showAddForm ? <X className="mr-2" /> : <Plus className="mr-2" />}
          {showAddForm ? "Cancel" : "Add Department"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingDepartment) && (
        <form
          onSubmit={editingDepartment ? handleEditSubmit : handleSubmit}
          className="bg-gray-800 p-6 rounded-lg mb-6"
        >
          <h3 className="text-xl font-semibold mb-4">
            {editingDepartment ? "Edit Department" : "Add New Department"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">
                Department Name*
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">
                Department Code
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g., CS, EE, HR"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
            />
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-500 rounded"
            />
            <label className="ml-2 text-gray-300">Active Department</label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={
                editingDepartment ? cancelEditing : () => setShowAddForm(false)
              }
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center"
            >
              <X className="mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Save className="mr-2" />
              )}
              {editingDepartment ? "Update Department" : "Create Department"}
            </button>
          </div>
        </form>
      )}

      {/* Departments List */}
      {loading && departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
          <p className="text-gray-400">Loading departments...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
          <p>{error}</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p>No departments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDepartments.map((department) => (
            <div
              key={department.id}
              className="bg-gray-800 p-4 rounded-lg flex justify-between items-start"
            >
              <div>
                <div className="flex items-center">
                  <h3 className="text-lg font-medium">{department.name}</h3>
                  {department.code && (
                    <span className="ml-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                      {department.code}
                    </span>
                  )}
                  <span
                    className={`ml-3 px-2 py-1 text-xs rounded ${
                      department.is_active !== false
                        ? "bg-green-900/30 text-green-400"
                        : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    {department.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                {department.description && (
                  <p className="text-gray-300 mt-2">{department.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => startEditing(department)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(department)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Department"
        message={`Are you sure you want to delete ${departmentToDelete?.name}?`}
      />
    </div>
  );
}

// Amenities Tab Component
function AmenitiesTab({ showAlert }) {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [amenityToDelete, setAmenityToDelete] = useState(null);

  // Fetch amenities
  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        setLoading(true);
        const response = await api.get("amenities/");
        setAmenities(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching amenities:", err);
        setError("Failed to load amenities. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAmenities();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission for new amenity
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("amenities/create/", formData);

      // Refresh amenities list
      const response = await api.get("amenities/");
      setAmenities(response.data);

      // Reset form
      setFormData({
        name: "",
        description: "",
      });
      setShowAddForm(false);
      showAlert("success", `Amenity "${formData.name}" created successfully!`);
    } catch (err) {
      console.error("Error creating amenity:", err);
      setError("Failed to create amenity. Please try again.");
      showAlert("danger", "Failed to create amenity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle amenity deletion confirmation dialog
  const handleDeleteClick = (amenity) => {
    setAmenityToDelete(amenity);
    setShowDeleteConfirm(true);
  };

  // Handle amenity deletion
  const confirmDelete = async () => {
    if (!amenityToDelete) return;

    try {
      setLoading(true);
      await api.delete(`amenities/${amenityToDelete.id}/`);
      setAmenities(
        amenities.filter((amenity) => amenity.id !== amenityToDelete.id)
      );

      showAlert(
        "success",
        `Amenity "${amenityToDelete.name}" deleted successfully!`
      );
    } catch (err) {
      console.error("Error deleting amenity:", err);
      setError("Failed to delete amenity. Please try again.");
      showAlert("danger", "Failed to delete amenity. Please try again.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setAmenityToDelete(null);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.patch(`amenities/${editingAmenity.id}/`, formData);

      // Refresh amenities list
      const response = await api.get("amenities/");
      setAmenities(response.data);

      // Reset form
      setFormData({
        name: "",
        description: "",
      });
      setEditingAmenity(null);
      showAlert("success", `Amenity "${formData.name}" updated successfully!`);
    } catch (err) {
      console.error("Error updating amenity:", err);
      setError("Failed to update amenity. Please try again.");
      showAlert("danger", "Failed to update amenity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start editing an amenity
  const startEditing = (amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      name: amenity.name,
      description: amenity.description || "",
    });
    setShowAddForm(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingAmenity(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  // Filter amenities based on search
  const filteredAmenities = amenities.filter((amenity) =>
    amenity.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-1/2">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search amenities..."
            className="w-full pl-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingAmenity(null);
            setFormData({
              name: "",
              description: "",
            });
          }}
        >
          {showAddForm ? <X className="mr-2" /> : <Plus className="mr-2" />}
          {showAddForm ? "Cancel" : "Add Amenity"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingAmenity) && (
        <form
          onSubmit={editingAmenity ? handleEditSubmit : handleSubmit}
          className="bg-gray-800 p-6 rounded-lg mb-6"
        >
          <h3 className="text-xl font-semibold mb-4">
            {editingAmenity ? "Edit Amenity" : "Add New Amenity"}
          </h3>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Amenity Name*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={
                editingAmenity ? cancelEditing : () => setShowAddForm(false)
              }
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center"
            >
              <X className="mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Save className="mr-2" />
              )}
              {editingAmenity ? "Update Amenity" : "Create Amenity"}
            </button>
          </div>
        </form>
      )}

      {/* Amenities List */}
      {loading && amenities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
          <p className="text-gray-400">Loading amenities...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
          <p>{error}</p>
        </div>
      ) : filteredAmenities.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p>No amenities found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAmenities.map((amenity) => (
            <div
              key={amenity.id}
              className="bg-gray-800 p-4 rounded-lg flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-medium">{amenity.name}</h3>
                {amenity.description && (
                  <p className="text-gray-300 mt-2">{amenity.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => startEditing(amenity)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(amenity)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Amenity"
        message={`Are you sure you want to delete ${amenityToDelete?.name}?`}
      />
    </div>
  );
}

export default AdminManageConfig;

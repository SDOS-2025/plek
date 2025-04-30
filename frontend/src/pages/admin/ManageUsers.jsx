import React, { useState, useEffect, useContext } from "react";
import {
  Search,
  Users,
  ShieldCheck,
  ChevronDown,
  Layers,
  UserCheck,
  User,
  Shield,
  Plus,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  Loader2,
  ChevronUpSquare,
  ChevronDownSquare,
  Building2,
} from "lucide-react";
import api from "../../api";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import Toast, { DeleteConfirmation } from "../../components/AlertToast";
import { AuthContext } from "../../context/AuthProvider";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [floors, setFloors] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState({
    title: "",
    message: "",
    action: null,
  });
  const [assignmentData, setAssignmentData] = useState({
    departments: [],
    floors: [],
    buildings: [],
  });
  // Move activeTab state to the parent component to persist during re-renders
  const [activeAssignmentTab, setActiveAssignmentTab] = useState("buildings");

  const { user: currentUser } = useContext(AuthContext);

  // State for current user's role information
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isSuperUser, setIsSuperUser] = useState(false);

  // Fetch current user's role information
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      if (!currentUser) return;

      try {
        // First try to get user profile
        const response = await api.get("/api/accounts/profile/");
        console.log("Current user profile:", response.data);

        // Check if user is SuperAdmin
        const groups = response.data.groups || [];
        const isSuperAdminByGroup = groups.some((g) => g.name === "SuperAdmin");
        const isSuperAdminByFlag = response.data.is_superuser === true;

        setCurrentUserRole(response.data);
        setIsSuperUser(isSuperAdminByGroup || isSuperAdminByFlag);
        console.log(
          "SuperAdmin status:",
          isSuperAdminByGroup || isSuperAdminByFlag
        );
      } catch (err) {
        console.error("Error fetching user role:", err);
        // Temporarily force SuperAdmin status for testing
        setIsSuperUser(true);
      }
    };

    fetchCurrentUserRole();
  }, [currentUser]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/accounts/users/");
        setUsers(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch departments and floors
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [departmentsRes, floorsRes, buildingsRes] = await Promise.all([
          api.get("/departments/"),
          api.get("/floors/"),
          api.get("/buildings/"),
        ]);

        setDepartments(departmentsRes.data);
        setFloors(floorsRes.data);
        setBuildings(buildingsRes.data);
      } catch (err) {
        console.error("Error fetching resources:", err);
        setError("Failed to load resources. Please try again later.");
      }
    };

    fetchResources();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  // Filter users based on search query and role filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (filter === "all") return matchesSearch;

    const userGroups =
      user.groups?.map((group) => group.name.toLowerCase()) || [];
    return matchesSearch && userGroups.includes(filter.toLowerCase());
  });

  // Get user role (group) for display
  const getUserRole = (user) => {
    if (!user.groups || user.groups.length === 0) return "User";
    return user.groups[0]?.name || "User";
  };

  // Get next role up in the hierarchy for promotion
  const getNextRoleUp = (currentRole) => {
    const roleHierarchy = ["User", "Coordinator", "Admin", "SuperAdmin"];
    const currentIndex = roleHierarchy.indexOf(currentRole);
    return currentIndex < roleHierarchy.length - 1
      ? roleHierarchy[currentIndex + 1]
      : null;
  };

  // Get next role down in the hierarchy for demotion
  const getNextRoleDown = (currentRole) => {
    const roleHierarchy = ["User", "Coordinator", "Admin", "SuperAdmin"];
    const currentIndex = roleHierarchy.indexOf(currentRole);
    return currentIndex > 0 ? roleHierarchy[currentIndex - 1] : null;
  };

  // Handle promotion
  const handlePromote = (user) => {
    const currentRole = getUserRole(user);
    const nextRole = getNextRoleUp(currentRole);

    if (nextRole) {
      handleRoleChangeClick(user, nextRole);
    }
  };

  // Handle demotion
  const handleDemote = (user) => {
    const currentRole = getUserRole(user);
    const prevRole = getNextRoleDown(currentRole);

    if (prevRole) {
      handleRoleChangeClick(user, prevRole);
    }
  };

  // Handle role change action
  const handleRoleChangeClick = (user, newRole) => {
    setSelectedUser(user);
    setTargetRole(newRole);

    // Determine appropriate message based on the roles being changed
    const currentRole = getUserRole(user);
    const roleHierarchy = ["User", "Coordinator", "Admin", "SuperAdmin"];
    const currentRoleIndex = roleHierarchy.indexOf(currentRole);
    const newRoleIndex = roleHierarchy.indexOf(newRole);

    const action = newRoleIndex > currentRoleIndex ? "promote" : "demote";

    setConfirmationDetails({
      title: `${action === "promote" ? "Promote" : "Demote"} ${
        user.first_name
      } ${user.last_name}`,
      message: `Are you sure you want to ${action} ${user.first_name} ${
        user.last_name
      } ${action === "promote" ? "to" : "from"} ${currentRole} ${
        action === "promote" ? "to" : "to"
      } ${newRole}?`,
      action: async () => {
        await changeUserRole(user.id, newRole);

        // For Coordinator roles, show the assignment modal after confirmation
        if (newRole === "Coordinator") {
          setShowAssignModal(true);
        }
      },
    });

    setShowConfirmation(true);
  };

  // Change user role via API
  const changeUserRole = async (userId, newRole) => {
    try {
      setLoading(true);

      // Find the user in our users array to get their current role
      const userToUpdate = users.find((u) => u.id === userId);
      if (!userToUpdate) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Determine if this is a promotion or demotion
      const currentRole = getUserRole(userToUpdate);
      const roleHierarchy = ["User", "Coordinator", "Admin", "SuperAdmin"];
      const currentRoleIndex = roleHierarchy.indexOf(currentRole);
      const newRoleIndex = roleHierarchy.indexOf(newRole);

      const action = newRoleIndex > currentRoleIndex ? "promote" : "demote";

      await api.post(`/api/accounts/users/${userId}/role/`, {
        action: action,
        group: newRole,
      });

      // Refresh the users list after role change
      const response = await api.get("/api/accounts/users/");
      setUsers(response.data);

      showAlert(
        "success",
        `User ${userToUpdate.first_name} ${userToUpdate.last_name} ${
          action === "promote" ? "promoted to" : "demoted to"
        } ${newRole}`
      );
    } catch (err) {
      console.error(`Error changing user role:`, err);
      const errorMsg =
        err.response?.data?.error ||
        `Failed to change user role. Please try again.`;
      showAlert("danger", errorMsg);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  // Reset and initialize assignment data when a user is selected
  const initializeAssignmentData = (user) => {
    // Get user's currently assigned resources
    const managedBuildings = user.managed_buildings || [];
    const managedFloors = user.managed_floors || [];
    const managedDepartments = user.managed_departments || [];

    // Find buildings containing assigned floors if no buildings explicitly assigned
    const buildingsFromFloors = [];
    if (managedBuildings.length === 0 && managedFloors.length > 0) {
      managedFloors.forEach((floorId) => {
        const floor = floors.find((f) => f.id === floorId);
        if (
          floor &&
          floor.building &&
          !buildingsFromFloors.includes(floor.building)
        ) {
          buildingsFromFloors.push(floor.building);
        }
      });
    }

    // Set the initial assignment data
    setAssignmentData({
      buildings: [...managedBuildings, ...buildingsFromFloors],
      floors: managedFloors,
      departments: managedDepartments,
    });

    // Reset to buildings tab when opening modal
    setActiveAssignmentTab("buildings");
  };

  // Handle assignment of floors or departments
  const handleAssignment = async () => {
    try {
      setLoading(true);

      // Update user with assignments (only for coordinators)
      await api.patch(`/api/accounts/users/${selectedUser.id}/`, {
        managed_floors: assignmentData.floors,
        managed_departments: assignmentData.departments,
        managed_buildings: assignmentData.buildings,
      });

      // Refresh user data
      const response = await api.get("/api/accounts/users/");
      setUsers(response.data);

      showAlert(
        "success",
        `Successfully assigned resources to ${selectedUser.first_name} ${selectedUser.last_name}`
      );

      setShowAssignModal(false);
    } catch (err) {
      console.error("Error assigning resources:", err);
      showAlert("danger", "Failed to assign resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle floor or department selection change
  const handleAssignmentChange = (type, id, checked) => {
    setAssignmentData((prev) => {
      const updatedArray = checked
        ? [...prev[type], id]
        : prev[type].filter((item) => item !== id);

      return { ...prev, [type]: updatedArray };
    });
  };

  // Assignment modal for coordinators
  const AssignmentModal = () => {
    if (!selectedUser) return null;

    // Get floors for the currently selected buildings
    const getFloorsForSelectedBuildings = () => {
      if (!assignmentData.buildings || assignmentData.buildings.length === 0)
        return [];

      // Filter floors that belong to the selected buildings
      return floors.filter((floor) =>
        assignmentData.buildings.includes(floor.building)
      );
    };

    // Group floors by building for better organization
    const floorsByBuilding = floors.reduce((groups, floor) => {
      const buildingId = floor.building;
      if (!groups[buildingId]) {
        groups[buildingId] = [];
      }
      groups[buildingId].push(floor);
      return groups;
    }, {});

    // Handle building selection change
    const handleBuildingChange = (buildingId, checked) => {
      // Update buildings list
      setAssignmentData((prev) => {
        const updatedBuildings = checked
          ? [...prev.buildings, buildingId]
          : prev.buildings.filter((id) => id !== buildingId);

        // If a building is unchecked, also remove its floors from selection
        const buildingFloors = floors
          .filter((f) => f.building === buildingId)
          .map((f) => f.id);
        const updatedFloors = checked
          ? prev.floors
          : prev.floors.filter((floorId) => !buildingFloors.includes(floorId));

        return {
          ...prev,
          buildings: updatedBuildings,
          floors: updatedFloors,
        };
      });
    };

    // Get building name by ID
    const getBuildingName = (buildingId) => {
      const building = buildings.find((b) => b.id === buildingId);
      return building ? building.name : "Unknown Building";
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-plek-dark border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Assign Resources to {selectedUser.first_name}{" "}
              {selectedUser.last_name}
            </h2>
            <button
              onClick={() => setShowAssignModal(false)}
              className="p-2 hover:bg-gray-700 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab navigation */}
          <div className="flex border-b border-gray-700 mb-6">
            <button
              className={`px-4 py-2 font-medium ${
                activeAssignmentTab === "buildings"
                  ? "text-plek-purple border-b-2 border-plek-purple"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveAssignmentTab("buildings")}
            >
              1. Buildings
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeAssignmentTab === "floors"
                  ? "text-plek-purple border-b-2 border-plek-purple"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveAssignmentTab("floors")}
            >
              2. Floors
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeAssignmentTab === "departments"
                  ? "text-plek-purple border-b-2 border-plek-purple"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveAssignmentTab("departments")}
            >
              3. Departments
            </button>
          </div>

          {/* Buildings tab content */}
          {activeAssignmentTab === "buildings" && (
            <div className="mb-6">
              <h3 className="font-medium mb-2 flex items-center">
                <Building2 className="mr-2" size={18} />
                Select Buildings
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                First, select which buildings this coordinator will manage.
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-800 rounded-lg">
                {buildings.length === 0 ? (
                  <p className="text-gray-400 text-sm py-2">
                    No buildings available
                  </p>
                ) : (
                  buildings.map((building) => (
                    <div
                      key={building.id}
                      className="flex items-center p-2 hover:bg-gray-700 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        id={`building-${building.id}`}
                        checked={assignmentData.buildings.includes(building.id)}
                        onChange={(e) =>
                          handleBuildingChange(building.id, e.target.checked)
                        }
                        className="mr-2 h-4 w-4 rounded"
                      />
                      <label
                        htmlFor={`building-${building.id}`}
                        className="cursor-pointer flex-1"
                      >
                        {building.name}
                        {building.address && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({building.address})
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setActiveAssignmentTab("floors")}
                  className="px-4 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg"
                  disabled={assignmentData.buildings.length === 0}
                >
                  Next: Select Floors
                </button>
              </div>
            </div>
          )}

          {/* Floors tab content */}
          {activeAssignmentTab === "floors" && (
            <div className="mb-6">
              <h3 className="font-medium mb-2 flex items-center">
                <Layers className="mr-2" size={18} />
                Assign Floors
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Select specific floors within the buildings you've chosen.
              </p>

              {assignmentData.buildings.length === 0 ? (
                <div className="bg-amber-900/30 border border-amber-700 text-amber-200 p-4 rounded-lg mb-4">
                  <p className="flex items-center">
                    <AlertCircle className="mr-2" size={18} />
                    Please select at least one building first.
                  </p>
                  <button
                    onClick={() => setActiveAssignmentTab("buildings")}
                    className="mt-2 px-3 py-1 text-sm bg-amber-800/50 hover:bg-amber-800 rounded-lg"
                  >
                    Go to Buildings
                  </button>
                </div>
              ) : (
                <>
                  {assignmentData.buildings.map((buildingId) => {
                    const buildingFloors = floorsByBuilding[buildingId] || [];
                    const buildingName = getBuildingName(buildingId);

                    if (buildingFloors.length === 0) return null;

                    return (
                      <div key={buildingId} className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2 pb-1 border-b border-gray-700">
                          {buildingName}
                        </h4>
                        <div className="space-y-2 pl-2">
                          {buildingFloors.map((floor) => (
                            <div
                              key={floor.id}
                              className="flex items-center p-2 hover:bg-gray-700 rounded-lg"
                            >
                              <input
                                type="checkbox"
                                id={`floor-${floor.id}`}
                                checked={assignmentData.floors.includes(
                                  floor.id
                                )}
                                onChange={(e) =>
                                  handleAssignmentChange(
                                    "floors",
                                    floor.id,
                                    e.target.checked
                                  )
                                }
                                className="mr-2 h-4 w-4 rounded"
                              />
                              <label
                                htmlFor={`floor-${floor.id}`}
                                className="cursor-pointer flex-1"
                              >
                                {floor.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() => setActiveAssignmentTab("buildings")}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                    >
                      Back to Buildings
                    </button>
                    <button
                      onClick={() => setActiveAssignmentTab("departments")}
                      className="px-4 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg"
                    >
                      Next: Select Departments
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Departments tab content */}
          {activeAssignmentTab === "departments" && (
            <div className="mb-6">
              <h3 className="font-medium mb-2 flex items-center">
                <Users className="mr-2" size={18} />
                Assign Departments
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Coordinators can manage rooms assigned to these departments.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-800 rounded-lg">
                {departments.length === 0 ? (
                  <p className="text-gray-400 text-sm py-2">
                    No departments available
                  </p>
                ) : (
                  departments.map((department) => (
                    <div
                      key={department.id}
                      className="flex items-center p-2 hover:bg-gray-700 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        id={`department-${department.id}`}
                        checked={assignmentData.departments.includes(
                          department.id
                        )}
                        onChange={(e) =>
                          handleAssignmentChange(
                            "departments",
                            department.id,
                            e.target.checked
                          )
                        }
                        className="mr-2 h-4 w-4 rounded"
                      />
                      <label
                        htmlFor={`department-${department.id}`}
                        className="cursor-pointer flex-1"
                      >
                        {department.name}
                        {department.code && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({department.code})
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => setActiveAssignmentTab("floors")}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                >
                  Back to Floors
                </button>
                <button
                  onClick={handleAssignment}
                  className="px-4 py-2 bg-plek-purple hover:bg-purple-700 rounded-lg flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2" size={18} />
                  )}
                  Save Assignments
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <NavBar activePage="manage-users" />

      <div className="main-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            User Role Management
          </h1>
          <p className="text-gray-400">
            Manage users, assign roles, and configure permissions
          </p>
        </div>

        {/* Search and filter section */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative md:w-1/2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full pl-12 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <div className="dropdown relative">
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center"
                onClick={() =>
                  document
                    .getElementById("filter-dropdown")
                    .classList.toggle("hidden")
                }
              >
                <Users className="mr-2 h-4 w-4" />
                Filter by Role
                <ChevronDown size={16} className="ml-2" />
              </button>
              <div
                id="filter-dropdown"
                className="dropdown-content hidden absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-10 py-1"
              >
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                    filter === "all" ? "bg-gray-700" : ""
                  }`}
                  onClick={() => setFilter("all")}
                >
                  All Users
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                    filter === "user" ? "bg-gray-700" : ""
                  }`}
                  onClick={() => setFilter("user")}
                >
                  Regular Users
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                    filter === "coordinator" ? "bg-gray-700" : ""
                  }`}
                  onClick={() => setFilter("coordinator")}
                >
                  Coordinators
                </button>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                    filter === "admin" ? "bg-gray-700" : ""
                  }`}
                  onClick={() => setFilter("admin")}
                >
                  Administrators
                </button>
                {isSuperUser && (
                  <button
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                      filter === "superadmin" ? "bg-gray-700" : ""
                    }`}
                    onClick={() => setFilter("superadmin")}
                  >
                    Super Administrators
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Role legend */}
        <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
          <h3 className="text-gray-300 flex items-center mb-2">
            <Info size={18} className="mr-2" />
            Role Permissions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start space-x-2">
              <User size={16} className="text-gray-400 mt-1" />
              <div>
                <p className="text-sm font-medium">User</p>
                <p className="text-xs text-gray-400">
                  Can book rooms and manage their own bookings
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <UserCheck size={16} className="text-green-500 mt-1" />
              <div>
                <p className="text-sm font-medium">Coordinator</p>
                <p className="text-xs text-gray-400">
                  Can approve bookings for assigned floors and departments
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Shield size={16} className="text-blue-500 mt-1" />
              <div>
                <p className="text-sm font-medium">Administrator</p>
                <p className="text-xs text-gray-400">
                  Can manage all rooms and promote users to coordinators
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <ShieldCheck size={16} className="text-purple-500 mt-1" />
              <div>
                <p className="text-sm font-medium">Super Admin</p>
                <p className="text-xs text-gray-400">
                  Full system access including promoting to admin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="section-card">
          <h2 className="card-header">
            <Users className="h-5 w-5 mr-2 text-purple-500" />
            User Management
          </h2>

          {loading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2
                size={40}
                className="animate-spin text-purple-500 mb-4"
              />
              <p className="text-gray-400">Loading users...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg text-center">
              <p>{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No users found matching the search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700 text-gray-300">
                  <tr>
                    <th className="p-4 rounded-tl-lg">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4 rounded-tr-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map((user, index) => {
                    const role = getUserRole(user);
                    const isCurrentUser = user.id === currentUser?.id;

                    // Check if user can be promoted or demoted based on role and permissions
                    const canPromote =
                      !isCurrentUser &&
                      ((isSuperUser && role !== "SuperAdmin") ||
                        (!isSuperUser &&
                          role !== "Admin" &&
                          role !== "SuperAdmin"));

                    const canDemote =
                      !isCurrentUser &&
                      ((isSuperUser && role !== "User") ||
                        (!isSuperUser && role === "Coordinator"));

                    return (
                      <tr
                        key={user.id}
                        className={`${
                          index % 2 === 0 ? "bg-plek-dark" : "bg-[#1E2631]"
                        } hover:bg-plek-hover`}
                      >
                        <td className="p-4">
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-400">
                            Member since{" "}
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            {role === "SuperAdmin" && (
                              <ShieldCheck
                                size={16}
                                className="text-purple-500"
                              />
                            )}
                            {role === "Admin" && (
                              <Shield size={16} className="text-blue-500" />
                            )}
                            {role === "Coordinator" && (
                              <UserCheck size={16} className="text-green-500" />
                            )}
                            {(role === "User" || !role) && (
                              <User size={16} className="text-gray-400" />
                            )}
                            <span>{role || "User"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {role === "Coordinator" && (
                            <div className="text-sm">
                              {user.managed_floors?.length > 0 && (
                                <div className="flex items-center text-gray-300 mb-1">
                                  <Layers size={14} className="mr-1" />
                                  <span>
                                    {user.managed_floors.length} Floor(s)
                                  </span>
                                </div>
                              )}
                              {user.managed_departments?.length > 0 && (
                                <div className="flex items-center text-gray-300">
                                  <Users size={14} className="mr-1" />
                                  <span>
                                    {user.managed_departments.length}{" "}
                                    Department(s)
                                  </span>
                                </div>
                              )}
                              {(!user.managed_floors ||
                                user.managed_floors.length === 0) &&
                                (!user.managed_departments ||
                                  user.managed_departments.length === 0) && (
                                  <span className="text-gray-500">
                                    No assignments
                                  </span>
                                )}
                            </div>
                          )}
                          {role === "Admin" && (
                            <span className="text-gray-500">All buildings</span>
                          )}
                          {(role === "User" ||
                            role === "SuperAdmin" ||
                            !role) && <span className="text-gray-500">—</span>}
                        </td>
                        <td className="p-4 text-right">
                          {isCurrentUser ? (
                            <span className="text-gray-500">
                              Cannot modify your own role
                            </span>
                          ) : (
                            <div className="flex justify-end space-x-2">
                              {canPromote && (
                                <button
                                  onClick={() => handlePromote(user)}
                                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                  title={`Promote to ${getNextRoleUp(role)}`}
                                >
                                  <ChevronUpSquare size={18} />
                                </button>
                              )}

                              {role === "Coordinator" && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    initializeAssignmentData(user);
                                    setShowAssignModal(true);
                                  }}
                                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                  title="Assign Resources"
                                >
                                  <Layers size={18} />
                                </button>
                              )}

                              {canDemote && (
                                <button
                                  onClick={() => handleDemote(user)}
                                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                  title={`Demote to ${getNextRoleDown(role)}`}
                                >
                                  <ChevronDownSquare size={18} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Show confirmation dialog */}
      {showConfirmation && (
        <DeleteConfirmation
          show={showConfirmation}
          onConfirm={confirmationDetails.action}
          onCancel={() => setShowConfirmation(false)}
          title={confirmationDetails.title}
          message={confirmationDetails.message}
          confirmButtonText="Confirm"
        />
      )}

      {/* Assignment modal */}
      {showAssignModal && <AssignmentModal />}

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

export default ManageUsers;

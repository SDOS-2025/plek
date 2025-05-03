import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Search,
  Calendar,
  Clock,
  Users,
  Filter,
  Check,
  X,
  AlertCircle,
  Building2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "../../api";
import { DateTime } from "luxon";
import ModifyBookingModal from "../../components/ModifyBooking";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import Toast, { DeleteConfirmation } from "../../components/AlertToast";
import { AuthContext } from "../../context/AuthProvider";

function ManageBookings() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [approvedBookings, setApprovedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    type: "success", // 'success', 'danger', or 'warning'
    message: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [userRole, setUserRole] = useState(null); // Initialize as null instead of "admin"
  const [coordinatorResources, setCoordinatorResources] = useState({
    buildings: [],
    floors: [],
    departments: [],
  }); // State to store coordinator's managed resources

  // Filter states
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedParticipants, setSelectedParticipants] = useState("all"); // New filter for participants

  const firstName = localStorage.getItem("FirstName");

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  // Fetch user profile to determine role
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Fetch the user profile to get accurate role information
        const profileResponse = await api.get("/api/accounts/profile/");
        const userProfile = profileResponse.data;
        console.log("User profile:", userProfile);

        // Determine role from groups in the profile
        const groups = userProfile.groups || [];
        const groupNames = groups.map((group) =>
          typeof group === "string"
            ? group.toLowerCase()
            : group.name.toLowerCase()
        );

        if (userProfile.is_superuser || groupNames.includes("superadmin")) {
          setUserRole("superadmin");
          console.log("User role: superadmin");
        } else if (groupNames.includes("admin")) {
          setUserRole("admin");
          console.log("User role: admin");
        } else if (groupNames.includes("coordinator")) {
          setUserRole("coordinator");
          console.log("User role: coordinator");

          // For coordinators, immediately fetch their assigned floors/departments data
          // to ensure we always have the proper data displayed
          try {
            const coordResponse = await api.get("/bookings/floor-dept/");
            console.log(
              "Coordinator resources fetched directly:",
              coordResponse.data
            );

            // Extract managed resources from the response
            const managedBuildingsData =
              coordResponse.data.managed_buildings || [];
            const managedFloorsData = coordResponse.data.managed_floors || [];
            const managedDepartmentsData =
              coordResponse.data.managed_departments || [];
            const bookingsData = coordResponse.data.bookings || [];

            // Set coordinator resources from API response - this is the most reliable source
            setCoordinatorResources({
              buildings: managedBuildingsData,
              floors: managedFloorsData,
              departments: managedDepartmentsData,
            });

            // Process bookings directly
            const processedBookings = await processBookings(bookingsData);

            // Split bookings into pending requests and approved bookings
            const requests = processedBookings.filter(
              (booking) => booking.status.toLowerCase() === "pending"
            );
            const approved = processedBookings.filter(
              (booking) => booking.status.toLowerCase() === "approved"
            );

            setBookingRequests(requests);
            setApprovedBookings(approved);
            setError(null);
            setLoading(false);
          } catch (coordError) {
            console.error("Error fetching coordinator data:", coordError);
            // If there's an error, we'll fall back to the regular fetchBookings
          }
        } else {
          setUserRole("user");
          console.log("User role: regular user");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to a safe default
        setUserRole("user");
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Fetch bookings data - modified to skip coordinator fetching since we handle it directly above
  useEffect(() => {
    const fetchBookings = async () => {
      // Don't fetch again if we're a coordinator - handled in fetchUserProfile
      if (userRole === "coordinator") {
        return;
      }

      try {
        setLoading(true);
        let bookingsData = [];

        // For admins and superadmins, fetch all bookings
        const response = await api.get("/bookings/all/");
        console.log("Fetched all bookings:", response.data);
        bookingsData = response.data;

        const allBookings = await processBookings(bookingsData || []);

        // Split bookings into pending requests and approved bookings
        const requests = allBookings.filter(
          (booking) => booking.status.toLowerCase() === "pending"
        );
        const approved = allBookings.filter(
          (booking) => booking.status.toLowerCase() === "approved"
        );

        setBookingRequests(requests);
        setApprovedBookings(approved);
        setError(null);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch for admin/superadmin users or when we need to refresh data
    if (userRole === "admin" || userRole === "superadmin") {
      fetchBookings();

      // Set up auto-refresh for admin/superadmin
      const intervalId = setInterval(() => {
        fetchBookings();
      }, 120000);

      return () => clearInterval(intervalId);
    }
  }, [userRole]);

  // Add a separate effect for refreshing coordinator data
  useEffect(() => {
    // Function to refresh coordinator data
    const refreshCoordinatorData = async () => {
      if (userRole !== "coordinator") {
        return;
      }

      try {
        const response = await api.get("/bookings/floor-dept/");

        // Extract data from response
        const managedBuildingsData = response.data.managed_buildings || [];
        const managedFloorsData = response.data.managed_floors || [];
        const managedDepartmentsData = response.data.managed_departments || [];
        const bookingsData = response.data.bookings || [];

        // Update coordinator resources
        setCoordinatorResources({
          buildings: managedBuildingsData,
          floors: managedFloorsData,
          departments: managedDepartmentsData,
        });

        // Process and update bookings
        const processedBookings = await processBookings(bookingsData);

        // Split and update
        const requests = processedBookings.filter(
          (booking) => booking.status.toLowerCase() === "pending"
        );
        const approved = processedBookings.filter(
          (booking) => booking.status.toLowerCase() === "approved"
        );

        setBookingRequests(requests);
        setApprovedBookings(approved);
      } catch (error) {
        console.error("Error refreshing coordinator data:", error);
      }
    };

    // Only set up refresh interval for coordinators
    if (userRole === "coordinator") {
      // Set up auto-refresh every 2 minutes
      const intervalId = setInterval(() => {
        refreshCoordinatorData();
      }, 120000);

      return () => clearInterval(intervalId);
    }
  }, [userRole]);

  // Process bookings to match expected format
  const processBookings = async (bookings) => {
    const processedBookings = [];

    for (const booking of bookings) {
      // Parse start and end times - store original ISO strings for API interactions
      const originalStartTime = booking.start_time;
      const originalEndTime = booking.end_time;

      const startTime = DateTime.fromISO(booking.start_time, {
        zone: "Asia/Kolkata",
      });
      const endTime = DateTime.fromISO(booking.end_time, {
        zone: "Asia/Kolkata",
      });

      // Format date and time slot
      const formattedDate = startTime.toFormat("LLLL d, yyyy");
      const formattedTimeSlot = `${startTime.toFormat(
        "h a"
      )} - ${endTime.toFormat("h a")}`;

      // Get room information directly from the booking response
      let roomName = booking.room_name || "Unknown Room";
      let buildingName = booking.building_name || "";

      // Get room capacity directly from the API response
      let roomCapacity = booking.room_capacity || 0;

      // As a fallback, if room_capacity isn't available but participants is numeric, use that
      if (
        roomCapacity === 0 &&
        booking.participants &&
        !isNaN(parseInt(booking.participants))
      ) {
        roomCapacity = parseInt(booking.participants);
      }

      // Get user information from booking data
      const userName =
        booking.user_first_name || booking.user_last_name
          ? `${booking.user_first_name || ""} ${
              booking.user_last_name || ""
            }`.trim()
          : booking.user_email || `User ${booking.user}`;

      // Create processed booking with correct structure
      processedBookings.push({
        id: booking.id,
        room: roomName,
        roomId: booking.room,
        building: buildingName,
        capacity: roomCapacity,
        date: formattedDate,
        slot: formattedTimeSlot,
        start_time: originalStartTime,
        end_time: originalEndTime,
        status: booking.status,
        purpose: booking.purpose || "",
        participants: booking.participants || 0,
        attendees: booking.participants || 0,
        notes: booking.notes || "",
        user: userName,
        userFirstName: booking.user_first_name || "",
        userLastName: booking.user_last_name || "",
        userEmail: booking.user_email || "",
        userId: booking.user,
        floorId: booking.room_floor_id,
        departmentIds: booking.room_department_ids,
        original: booking, // Keep original data in case we need it
      });
    }

    return processedBookings;
  };

  const handleModifyClick = (booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  const handleApprove = async (bookingId) => {
    try {
      const payload = {
        action: "approve",
      };

      const response = await api.post(
        `/bookings/approval/${bookingId}/`,
        payload
      );

      if (response.status === 200) {
        // Update local state
        const updatedRequests = bookingRequests.filter(
          (req) => req.id !== bookingId
        );
        const approvedBooking = bookingRequests.find(
          (req) => req.id === bookingId
        );

        if (approvedBooking) {
          approvedBooking.action = "APPROVED";
          setApprovedBookings([...approvedBookings, approvedBooking]);
        }

        setBookingRequests(updatedRequests);

        // Show success alert
        showAlert("success", "Booking request approved successfully!");
      }
    } catch (error) {
      console.error("Error approving booking:", error);
      showAlert("danger", "Failed to approve booking. Please try again.");
    }
  };

  const handleReject = async (bookingId) => {
    try {
      const payload = {
        action: "reject",
      };

      const response = await api.post(
        `/bookings/approval/${bookingId}/`,
        payload
      );

      if (response.status === 200) {
        // Remove the rejected booking from pending requests
        const updatedRequests = bookingRequests.filter(
          (req) => req.id !== bookingId
        );
        setBookingRequests(updatedRequests);

        // Show success alert
        showAlert("success", "Booking request rejected successfully!");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      showAlert("danger", "Failed to reject booking. Please try again.");
    }
  };

  const handleRejectApproved = async (bookingId) => {
    try {
      const payload = {
        action: "reject",
      };

      const response = await api.post(
        `/bookings/approval/${bookingId}/`,
        payload
      );

      if (response.status === 200) {
        // Remove the rejected booking from approved bookings
        const updatedApproved = approvedBookings.filter(
          (booking) => booking.id !== bookingId
        );
        setApprovedBookings(updatedApproved);

        // Show success alert
        showAlert("success", "Booking has been rejected!");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      showAlert("danger", "Failed to reject booking. Please try again.");
    } finally {
      setShowDeleteConfirm(false);
      setBookingToDelete(null);
    }
  };

  const handleDeleteClick = (bookingId) => {
    setBookingToDelete(bookingId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!bookingToDelete) return;

    // If we're in the approved bookings tab, reject the booking instead of deleting it
    if (activeTab === "bookings") {
      await handleRejectApproved(bookingToDelete);
      return;
    }

    // Otherwise delete the booking (for pending requests)
    try {
      const response = await api.delete(`/bookings/${bookingToDelete}/`);

      if (response.status === 204 || response.status === 200) {
        // Update local state
        const updatedRequests = bookingRequests.filter(
          (req) => req.id !== bookingToDelete
        );
        const updatedApproved = approvedBookings.filter(
          (booking) => booking.id !== bookingToDelete
        );

        setBookingRequests(updatedRequests);
        setApprovedBookings(updatedApproved);

        // Show success alert
        showAlert("success", "Booking cancelled successfully!");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showAlert("danger", "Failed to cancel booking. Please try again.");
    } finally {
      setShowDeleteConfirm(false);
      setBookingToDelete(null);
    }
  };

  // Extract unique buildings for filter dropdown
  const buildings = useMemo(() => {
    // Start with "all" option
    let buildingOptions = ["all"];

    // If user is a coordinator, only show their managed buildings
    if (userRole === "coordinator") {
      // Extract building names from coordinator resources
      const managedBuildingNames = coordinatorResources.buildings.map(
        (building) => (typeof building === "object" ? building.name : building)
      );

      // Add unique buildings from bookings that match managed buildings
      const availableBuildings = new Set(
        [
          ...bookingRequests.map((booking) => booking.building),
          ...approvedBookings.map((booking) => booking.building),
        ].filter((building) =>
          // Only include buildings that match a managed building name
          managedBuildingNames.includes(building)
        )
      );

      return [...buildingOptions, ...availableBuildings];
    } else {
      // For admins and superadmins, show all unique buildings
      return [
        ...buildingOptions,
        ...new Set([
          ...bookingRequests.map((booking) => booking.building),
          ...approvedBookings.map((booking) => booking.building),
        ]),
      ].filter(Boolean); // Remove any undefined or empty values
    }
  }, [bookingRequests, approvedBookings, userRole, coordinatorResources]);

  // Date range options for filter
  const dateRanges = [
    { label: "All Dates", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  // Status options for filter (when in bookings tab)
  const statuses = [
    { label: "All Statuses", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Cancelled", value: "cancelled" },
  ];

  // Filter bookings based on search query and filters
  const filterBookings = (bookings) => {
    return bookings.filter((booking) => {
      const roomText =
        typeof booking.room === "string"
          ? booking.room.toLowerCase()
          : String(booking.room).toLowerCase();
      const buildingText =
        typeof booking.building === "string"
          ? booking.building.toLowerCase()
          : String(booking.building).toLowerCase();
      const userText =
        typeof booking.user === "string"
          ? booking.user.toLowerCase()
          : String(booking.user).toLowerCase();

      const searchTermLower = searchQuery.toLowerCase();

      // Basic search matching
      const matchesSearch =
        roomText.includes(searchTermLower) ||
        buildingText.includes(searchTermLower) ||
        userText.includes(searchTermLower);

      // Building filter
      const matchesBuilding =
        selectedBuilding === "all" || booking.building === selectedBuilding;

      // For coordinators, only show bookings for their managed resources
      let matchesCoordinatorResources = true;
      if (userRole === "coordinator") {
        // Get lists of managed building names, floor IDs, and department IDs
        const managedBuildingNames = coordinatorResources.buildings.map(
          (building) =>
            typeof building === "object" ? building.name : building
        );
        const managedFloorIds = coordinatorResources.floors.map((floor) =>
          typeof floor === "object" ? floor.id : floor
        );
        const managedDepartmentIds = coordinatorResources.departments.map(
          (dept) => (typeof dept === "object" ? dept.id : dept)
        );

        // A booking matches if it belongs to a managed building, floor, or department
        const bookingBuilding = booking.building;
        const bookingFloorId = booking.original?.room?.floor || booking.floorId;
        const bookingDepartmentIds =
          booking.original?.room?.departments || booking.departmentIds || [];

        const matchesManagedBuilding =
          managedBuildingNames.includes(bookingBuilding);
        const matchesManagedFloor =
          bookingFloorId && managedFloorIds.includes(bookingFloorId);
        const matchesManagedDepartment =
          Array.isArray(bookingDepartmentIds) &&
          bookingDepartmentIds.some((deptId) =>
            managedDepartmentIds.includes(deptId)
          );

        matchesCoordinatorResources =
          matchesManagedBuilding ||
          matchesManagedFloor ||
          matchesManagedDepartment;
      }

      // Date filtering
      let matchesDate = true;
      if (selectedDateRange !== "all") {
        const bookingDate = DateTime.fromFormat(booking.date, "LLLL d, yyyy");
        const today = DateTime.now().startOf("day");

        if (selectedDateRange === "today") {
          matchesDate = bookingDate.hasSame(today, "day");
        } else if (selectedDateRange === "week") {
          const startOfWeek = today.startOf("week");
          const endOfWeek = today.endOf("week");
          matchesDate = bookingDate >= startOfWeek && bookingDate <= endOfWeek;
        } else if (selectedDateRange === "month") {
          matchesDate = bookingDate.hasSame(today, "month");
        }
      }

      // Status filtering (only applies to bookings tab)
      const matchesStatus =
        selectedStatus === "all" ||
        booking.status?.toLowerCase() === selectedStatus;

      // Capacity filtering
      let matchesCapacity = true;
      if (selectedCapacity !== "all") {
        // Make sure we have a numeric capacity
        const capacity = booking.capacity ? parseInt(booking.capacity) : 0;

        // Debug the capacity filtering
        console.log(
          `Filtering booking ${booking.id} with capacity: ${capacity}, selected filter: ${selectedCapacity}`
        );

        if (selectedCapacity === "small") {
          matchesCapacity = capacity >= 1 && capacity <= 10;
        } else if (selectedCapacity === "medium") {
          matchesCapacity = capacity >= 11 && capacity <= 30;
        } else if (selectedCapacity === "large") {
          matchesCapacity = capacity >= 31 && capacity <= 100;
        } else if (selectedCapacity === "xlarge") {
          matchesCapacity = capacity > 100;
        }

        // Debug the filter result
        console.log(`Match result for ${booking.room}: ${matchesCapacity}`);
      }

      // User filtering
      const matchesUser =
        selectedUser === "all" || booking.userFirstName === selectedUser;

      // Participants filtering
      let matchesParticipants = true;
      if (selectedParticipants !== "all") {
        // Parse participants count - try to extract a number from the string if needed
        let participantsCount = 0;

        if (typeof booking.participants === "number") {
          participantsCount = booking.participants;
        } else if (typeof booking.participants === "string") {
          // Try to extract number from string like "12 participants"
          const numMatch = booking.participants.match(/\d+/);
          if (numMatch) {
            participantsCount = parseInt(numMatch[0]);
          }
        }

        console.log(
          `Filtering booking ${booking.id} with participants: ${participantsCount}, selected filter: ${selectedParticipants}`
        );

        if (selectedParticipants === "small") {
          matchesParticipants =
            participantsCount >= 1 && participantsCount <= 5;
        } else if (selectedParticipants === "medium") {
          matchesParticipants =
            participantsCount >= 6 && participantsCount <= 15;
        } else if (selectedParticipants === "large") {
          matchesParticipants =
            participantsCount >= 16 && participantsCount <= 30;
        } else if (selectedParticipants === "xlarge") {
          matchesParticipants = participantsCount > 30;
        }
      }

      return (
        matchesSearch &&
        matchesBuilding &&
        matchesDate &&
        matchesStatus &&
        matchesCoordinatorResources &&
        matchesCapacity &&
        matchesUser &&
        matchesParticipants
      );
    });
  };

  const filteredRequests = filterBookings(bookingRequests);
  const filteredBookings = filterBookings(approvedBookings);

  // Get current data based on active tab
  const currentData =
    activeTab === "requests" ? filteredRequests : filteredBookings;

  const fetchBookingsForTab = async (tab) => {
    setLoading(true);
    try {
      if (userRole === "coordinator") {
        // For coordinators, fetch their specific bookings
        const response = await api.get("/bookings/floor-dept/");
        const bookingsData = response.data.bookings || [];
        const processedBookings = await processBookings(bookingsData);

        // Current date for comparing to find past bookings
        const now = DateTime.now();

        // Filter bookings based on the selected tab
        if (tab === "requests") {
          const requests = processedBookings.filter(
            (booking) => booking.status.toLowerCase() === "pending"
          );
          setBookingRequests(requests);
        } else if (tab === "bookings") {
          // Get current approved bookings
          const approved = processedBookings.filter((booking) => {
            const bookingDateTime = DateTime.fromISO(booking.end_time);
            return (
              booking.status.toLowerCase() === "approved" &&
              bookingDateTime > now
            );
          });
          setApprovedBookings(approved);
        } else if (tab === "past") {
          // Get past bookings (completed, rejected, or cancelled)
          const pastBookings = processedBookings.filter((booking) => {
            const bookingDateTime = DateTime.fromISO(booking.end_time);
            return (
              bookingDateTime < now ||
              booking.status.toLowerCase() === "rejected" ||
              booking.status.toLowerCase() === "cancelled"
            );
          });

          // Sort past bookings by date (most recent first)
          pastBookings.sort((a, b) => {
            const dateA = DateTime.fromISO(a.end_time);
            const dateB = DateTime.fromISO(b.end_time);
            return dateB - dateA;
          });

          setApprovedBookings(pastBookings);
        }
      } else {
        // For admins and superadmins, fetch all bookings
        const response = await api.get("/bookings/all/");
        const bookingsData = response.data || [];
        const processedBookings = await processBookings(bookingsData);

        // Current date for comparing to find past bookings
        const now = DateTime.now();

        // Filter bookings based on the selected tab
        if (tab === "requests") {
          const requests = processedBookings.filter(
            (booking) => booking.status.toLowerCase() === "pending"
          );
          setBookingRequests(requests);
        } else if (tab === "bookings") {
          // Get current approved bookings
          const approved = processedBookings.filter((booking) => {
            const bookingDateTime = DateTime.fromISO(booking.end_time);
            return (
              booking.status.toLowerCase() === "approved" &&
              bookingDateTime > now
            );
          });
          setApprovedBookings(approved);
        } else if (tab === "past") {
          // Get past bookings (completed, rejected, or cancelled)
          const pastBookings = processedBookings.filter((booking) => {
            const bookingDateTime = DateTime.fromISO(booking.end_time);
            return (
              bookingDateTime < now ||
              booking.status.toLowerCase() === "rejected" ||
              booking.status.toLowerCase() === "cancelled"
            );
          });

          // Sort past bookings by date (most recent first)
          pastBookings.sort((a, b) => {
            const dateA = DateTime.fromISO(a.end_time);
            const dateB = DateTime.fromISO(b.end_time);
            return dateB - dateA;
          });

          setApprovedBookings(pastBookings);
        }
      }
      setError(null);
    } catch (error) {
      console.error(`Error fetching ${tab} bookings:`, error);
      setError(`Failed to load ${tab} bookings. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <NavBar activePage="manage-bookings" />

      <div className="main-content">
        {/* Header with tab buttons */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Manage Bookings</h1>
          <div className="flex space-x-3">
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "requests"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => {
                setActiveTab("requests");
                fetchBookingsForTab("requests");
              }}
            >
              Pending Requests
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "bookings"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => {
                setActiveTab("bookings");
                fetchBookingsForTab("bookings");
              }}
            >
              Approved Bookings
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "past"
                  ? "bg-plek-purple text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => {
                setActiveTab("past");
                fetchBookingsForTab("past");
              }}
            >
              Past Bookings
            </button>
          </div>
        </div>

        {/* Coordinator info banner */}
        {userRole === "coordinator" && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex items-start text-blue-200">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Coordinator View</p>
                <p className="text-sm">
                  You're viewing bookings for your assigned floors and
                  departments only.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                  <div>
                    <span className="font-medium">Managed Buildings:</span>{" "}
                    {coordinatorResources.buildings &&
                    coordinatorResources.buildings.length > 0
                      ? coordinatorResources.buildings
                          .filter(
                            (b) => b && (typeof b === "object" ? b.name : b)
                          )
                          .map((b) => {
                            if (typeof b === "object") {
                              return b.name || `Building ${b.id}`;
                            } else if (typeof b === "number") {
                              // If it's just a number ID, try to find the corresponding building object
                              const buildingObj = coordinatorResources.floors
                                .filter(
                                  (f) =>
                                    f &&
                                    typeof f === "object" &&
                                    f.building_id === b
                                )
                                .map((f) => f.building_name)[0];
                              return buildingObj || `Building ${b}`;
                            }
                            return String(b);
                          })
                          .filter(Boolean) // Remove any undefined/null values
                          .join(", ")
                      : "None"}
                  </div>
                  <div>
                    <span className="font-medium">Managed Floors:</span>{" "}
                    {/* Only show specifically managed floors with proper names */}
                    {coordinatorResources.floors &&
                    coordinatorResources.floors.length > 0
                      ? [
                          ...new Set(
                            coordinatorResources.floors
                              .filter(
                                (f) =>
                                  f &&
                                  (typeof f === "object"
                                    ? f.id || f.number || f.name
                                    : f)
                              )
                              .map((f) => {
                                if (typeof f === "object") {
                                  // Format floor as "Floor X" or use the floor name if available
                                  const floorName = f.name
                                    ? f.name
                                    : `Floor ${f.number}`;
                                  return floorName;
                                }
                                return f;
                              })
                          ),
                        ]
                          .sort()
                          .join(", ")
                      : "None"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Managed Departments:</span>{" "}
                    {/* Show department names and codes instead of IDs */}
                    {coordinatorResources.departments &&
                    coordinatorResources.departments.length > 0
                      ? coordinatorResources.departments
                          .filter((d) => d && typeof d === "object")
                          .map((d) => {
                            if (typeof d === "object") {
                              // Return department name with code if available
                              return (
                                d.name ||
                                (d.code
                                  ? `${d.code} Department`
                                  : `Department ${d.id}`)
                              );
                            }
                            return `Department ${d}`; // Fallback for non-object values
                          })
                          .join(", ")
                      : "None"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search bookings by room, building, or user..."
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
                  {buildings.map((building, index) => (
                    <option key={index} value={building}>
                      {building === "all" ? "All Buildings" : building}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date Range
                </label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Capacity
                </label>
                <select
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">Any Capacity</option>
                  <option value="small">Small (1-10)</option>
                  <option value="medium">Medium (11-30)</option>
                  <option value="large">Large (31-100)</option>
                  <option value="xlarge">Extra Large (100+)</option>
                </select>
              </div>

              {activeTab !== "past" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter by User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="all">All Users</option>
                    {[
                      ...new Set(
                        [...bookingRequests, ...approvedBookings]
                          .filter((booking) => booking.userFirstName)
                          .map((booking) => booking.userFirstName)
                      ),
                    ].map((userName, index) => (
                      <option key={index} value={userName}>
                        {userName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab !== "requests" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Participants Count
                </label>
                <select
                  value={selectedParticipants}
                  onChange={(e) => setSelectedParticipants(e.target.value)}
                  className="w-full bg-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">Any Number</option>
                  <option value="small">Small (1-5)</option>
                  <option value="medium">Medium (6-15)</option>
                  <option value="large">Large (16-30)</option>
                  <option value="xlarge">Extra Large (30+)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedBuilding("all");
                    setSelectedDateRange("all");
                    setSelectedStatus("all");
                    setSelectedCapacity("all");
                    setSelectedUser("all");
                    setSelectedParticipants("all");
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

        {/* Booking Table Layout */}
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading bookings...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <div className="text-red-400 text-xl mb-2">⚠️</div>
            <p className="text-gray-300">{error}</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-300">
              {activeTab === "requests"
                ? "No pending booking requests found."
                : "No approved bookings found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700 text-gray-300">
                <tr>
                  <th className="p-4 rounded-tl-lg">Room</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Requested by</th>
                  <th className="p-4">Attendees</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((booking, index) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-gray-700 ${
                      index % 2 === 0 ? "bg-plek-dark" : "bg-[#1E2631]" // Updated to a slightly lighter color
                    } hover:bg-plek-hover`}
                  >
                    <td className="p-4">
                      <div className="font-medium">{booking.room}</div>
                      <div className="text-sm text-gray-400">
                        {booking.building}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">{booking.date}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">{booking.slot}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {booking.purpose || "N/A"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {booking.userFirstName || booking.user}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-purple-400 mr-2" />
                        <span className="text-sm">
                          {booking.attendees || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs 
                ${
                  activeTab === "bookings"
                    ? "bg-green-900/30 text-green-400"
                    : booking.status.toLowerCase() === "pending"
                    ? "bg-yellow-900/30 text-yellow-400"
                    : "bg-red-900/30 text-red-400"
                }`}
                      >
                        {activeTab === "bookings" ? "APPROVED" : booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {activeTab === "requests" ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleModifyClick(booking)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Modify"
                          >
                            <Pencil size={18} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleApprove(booking.id)}
                            className="p-2 hover:bg-plek-purple/20 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check size={18} className="text-green-400" />
                          </button>
                          <button
                            onClick={() => handleReject(booking.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X size={18} className="text-red-400" />
                          </button>
                        </div>
                      ) : activeTab === "bookings" ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleModifyClick(booking)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Modify"
                          >
                            <Pencil size={18} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(booking.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X size={18} className="text-red-400" />
                          </button>
                        </div>
                      ) : (
                        // For "past" bookings tab - no actions needed
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer />

      {/* Modify Booking Modal */}
      {showModifyModal && selectedBooking && (
        <ModifyBookingModal
          booking={selectedBooking}
          onClose={(updatedBookingData) => {
            setShowModifyModal(false);

            // Check if we got updated data back from the modal
            if (!updatedBookingData) {
              // Just close the modal without any updates
              return;
            }

            console.log(
              "Booking data received from modal:",
              updatedBookingData
            );

            // Check if this is a booking that was approved from the modal
            if (
              updatedBookingData.status === "APPROVED" ||
              updatedBookingData.action === "APPROVED"
            ) {
              console.log("Booking was approved:", updatedBookingData);

              // First remove the booking from requests
              const updatedRequests = bookingRequests.filter(
                (req) => parseInt(req.id) !== parseInt(updatedBookingData.id)
              );

              // Create the approved booking object
              const approvedBooking = {
                ...selectedBooking,
                status: "APPROVED",
                // Update other fields that might have changed
                notes: updatedBookingData.notes || selectedBooking.notes,
                purpose: updatedBookingData.purpose || selectedBooking.purpose,
                participants:
                  updatedBookingData.participants ||
                  selectedBooking.participants,
                attendees:
                  updatedBookingData.participants || selectedBooking.attendees,
                room: updatedBookingData.room_name || selectedBooking.room,
                roomId: updatedBookingData.room || selectedBooking.roomId,
                building:
                  updatedBookingData.building_name || selectedBooking.building,
                start_time:
                  updatedBookingData.start_time || selectedBooking.start_time,
                end_time:
                  updatedBookingData.end_time || selectedBooking.end_time,
                id: updatedBookingData.id || selectedBooking.id,
              };

              // Update the state with the removed pending booking and added approved booking
              setBookingRequests(updatedRequests);
              setApprovedBookings([...approvedBookings, approvedBooking]);

              // Show success message
              showAlert("success", "Booking request approved successfully!");
            } else {
              // For regular updates, just refresh the data from the backend
              fetchBookingsForTab(activeTab);
            }
          }}
          onCancel={handleDeleteClick}
          isPending={activeTab === "requests"}
        />
      )}

      {/* Toast Alert */}
      {alert.show && (
        <Toast
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onClose={hideAlert}
        />
      )}

      {/* Delete/Reject Confirmation Dialog */}
      <DeleteConfirmation
        show={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title={activeTab === "bookings" ? "Reject Booking" : "Cancel Booking"}
        message={
          activeTab === "bookings"
            ? "Are you sure you want to reject this approved booking? This action cannot be undone."
            : "Are you sure you want to cancel this booking? This action cannot be undone."
        }
        confirmButtonText={
          activeTab === "bookings" ? "Reject" : "Cancel Booking"
        }
      />
    </div>
  );
}

export default ManageBookings;

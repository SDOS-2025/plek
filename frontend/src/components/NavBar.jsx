import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthProvider";
import { Menu, X, Shield } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import api from "../api"; // Import the API module

const NavBar = ({ activePage }) => {
  const { user } = useContext(AuthContext);
  const firstName =
    user?.firstName ||
    user?.first_name ||
    localStorage.getItem("firstName") ||
    "User";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userRole, setUserRole] = useState(null); // State to store user role details
  const [isCoordinator, setIsCoordinator] = useState(false); // State to track if user is a coordinator
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // State to track if user is a superadmin
  const [isRegularAdmin, setIsRegularAdmin] = useState(false); // State to track if user is a regular admin
  const location = useLocation();
  const path = location.pathname;

  // Extract the current page from URL, handling both admin and user routes
  const currentPageFromPath = path.split("/").filter(Boolean).pop(); // get last segment

  // Set active page from prop or derive from path
  const currentPage = activePage || currentPageFromPath || "";

  // Check if the user is currently in the admin section based on URL path
  const isInAdminSection = path.includes("/admin/");

  // Fetch user profile for role detection
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const response = await api.get("/api/accounts/profile/");
        const profileData = response.data;
        setUserRole(profileData);

        // Determine user roles based on profile data
        const groups = profileData.groups || [];

        // Process group data which can come in different formats
        const groupNames = groups.map((group) =>
          typeof group === "string"
            ? group.toLowerCase()
            : (group.name || "").toLowerCase()
        );

        const isCoordinatorRole = groupNames.includes("coordinator");
        const isSuperAdminRole =
          groupNames.includes("superadmin") ||
          profileData.is_superuser === true;
        const isRegularAdminRole =
          groupNames.includes("admin") || profileData.is_staff === true;

        setIsCoordinator(isCoordinatorRole);
        setIsSuperAdmin(isSuperAdminRole);
        setIsRegularAdmin(isRegularAdminRole);
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Handle scroll event for navbar transparency effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // User navigation links
  const userNavLinks = [
    { name: "Dashboard", path: "/dashboard", id: "dashboard" },
    { name: "Book a Room", path: "/booking", id: "booking" },
    { name: "My Bookings", path: "/my-bookings", id: "my-bookings" },
    { name: "Chat Assistant", path: "/chatbot", id: "chatbot" },
  ];

  // Admin navigation links (base links that everyone in admin section can see)
  const baseAdminNavLinks = [
    { name: "Dashboard", path: "/admin/dashboard", id: "dashboard" },
    {
      name: "Manage Bookings",
      path: "/admin/manage-bookings",
      id: "manage-bookings",
    },
  ];

  // Additional admin links for full admins and superadmins only
  const adminOnlyLinks = [
    { name: "Manage Rooms", path: "/admin/manage-rooms", id: "manage-rooms" },
    { name: "Manage Users", path: "/admin/manage-users", id: "manage-users" },
    {
      name: "Configuration",
      path: "/admin/manage-config",
      id: "manage-config",
    },
  ];

  // Analytics is available to all admin users including coordinators
  const commonAdminLinks = [
    { name: "Analytics", path: "/admin/analytics", id: "analytics" },
  ];

  // Build the admin navigation links based on user role
  let adminNavLinks = [...baseAdminNavLinks];

  // Only add admin-specific links if user is not a coordinator (is admin or superadmin)
  if (isRegularAdmin || isSuperAdmin) {
    adminNavLinks = [...adminNavLinks, ...adminOnlyLinks];
  }

  // Add common links available to all admin users
  adminNavLinks = [...adminNavLinks, ...commonAdminLinks];

  // Add Institute Policies link for superadmins only
  if (isSuperAdmin) {
    adminNavLinks.push({
      name: "Institute Policies",
      path: "/admin/institute-policies",
      id: "institute-policies",
    });
  }

  // Use the admin or user navigation links based on current URL path
  const navLinks = isInAdminSection ? adminNavLinks : userNavLinks;

  // Determine the dashboard link based on current section
  const dashboardLink = isInAdminSection ? "/admin/dashboard" : "/dashboard";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "shadow-md bg-plek-dark" : "bg-plek-dark bg-opacity-95"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and desktop navigation */}
          <div className="flex items-center">
            <Link to={dashboardLink} className="flex items-center">
              <span className="text-xl font-bold text-plek-purple">
                {isInAdminSection ? "Plek Admin" : "Plek"}
              </span>
            </Link>

            {/* Desktop menu */}
            <div className="hidden md:block ml-10">
              <div className="flex items-center space-x-6">
                {navLinks.map((link) => {
                  // Extract the ID from path for comparison with current page
                  const linkId = link.path.split("/").filter(Boolean).pop();

                  // Special case for dashboard paths
                  const isDashboard =
                    (link.id === "dashboard" && path === "/dashboard") ||
                    (link.id === "dashboard" && path === "/admin/dashboard");

                  // Check for active page
                  const isActive =
                    isDashboard ||
                    currentPage === linkId ||
                    currentPage === link.id;

                  return (
                    <Link
                      key={link.id}
                      to={link.path}
                      className={`${
                        isActive
                          ? "text-plek-purple border-b-2 border-plek-purple font-medium"
                          : "text-gray-400 hover:text-gray-200"
                      } px-1 py-2 transition-all duration-200 text-sm font-medium`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile menu button and profile */}
          <div className="flex items-center">
            <div className="hidden md:block">
              <ProfileMenu />
            </div>

            <div className="md:hidden flex items-center">
              <ProfileMenu />
              <button
                onClick={toggleMobileMenu}
                className="ml-2 p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? "block" : "hidden"} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-plek-dark border-t border-gray-800">
          {navLinks.map((link) => {
            // Extract the ID from path for comparison with current page
            const linkId = link.path.split("/").filter(Boolean).pop();

            // Special case for dashboard paths
            const isDashboard =
              (link.id === "dashboard" && path === "/dashboard") ||
              (link.id === "dashboard" && path === "/admin/dashboard");

            // Check for active page
            const isActive =
              isDashboard || currentPage === linkId || currentPage === link.id;

            return (
              <Link
                key={link.id}
                to={link.path}
                className={`${
                  isActive
                    ? "bg-plek-lightgray text-white"
                    : "text-gray-400 hover:bg-plek-hover hover:text-white"
                } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

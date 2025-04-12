import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthProvider";
import { Menu, X, Shield } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

const NavBar = ({ activePage }) => {
  const { user } = useContext(AuthContext);
  const firstName =
    user?.firstName ||
    user?.first_name ||
    localStorage.getItem("firstName") ||
    "User";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Set active page based on location if not provided as prop
  const currentPage = activePage || location.pathname.substring(1);

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

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", id: "dashboard" },
    {
      name: "Admin Dashboard",
      path: "/admin-dashboard",
      id: "admin-dashboard",
    },
    { name: "Book a Room", path: "/booking", id: "booking" },
    { name: "My Bookings", path: "/my-bookings", id: "my-bookings" },
    {
      name: "Manage Bookings",
      path: "/manage-bookings",
      id: "manage-bookings",
    },
    { name: "Manage Rooms", path: "/manage-rooms", id: "manage-rooms" },
    { name: "Analytics", path: "/analytics", id: "analytics" },
  ];

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
            <Link to="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-plek-purple">Plek</span>
            </Link>

            {/* Desktop menu */}
            <div className="hidden md:block ml-10">
              <div className="flex items-center space-x-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.id}
                    to={link.path}
                    className={`${
                      currentPage === link.id
                        ? "text-plek-purple border-b-2 border-plek-purple font-medium"
                        : "text-gray-400 hover:text-gray-200"
                    } px-1 py-2 transition-all duration-200 text-sm font-medium`}
                  >
                    {link.name}
                  </Link>
                ))}
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
          {navLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className={`${
                currentPage === link.id
                  ? "bg-plek-lightgray text-white"
                  : "text-gray-400 hover:bg-plek-hover hover:text-white"
              } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthProvider';

const NavBar = ({ activePage }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const firstName = user?.firstName || user?.first_name || localStorage.getItem("firstName") || "User";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="border-b border-gray-800 px-6 py-4 bg-plek-dark">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center">
            <span className="ml-2 text-xl font-semibold">Plek</span>
          </div>
          <div className="flex space-x-6">
            <Link
              to="/dashboard"
              className={`${activePage === 'dashboard' ? 'text-purple-400 hover:text-purple-300' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/booking" 
              className={`${activePage === 'booking' ? 'text-purple-400 hover:text-purple-300' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Book a room
            </Link>
            <Link 
              to="/my-bookings" 
              className={`${activePage === 'my-bookings' ? 'text-purple-400 hover:text-purple-300' : 'text-gray-400 hover:text-gray-300'}`}
            >
              My Bookings
            </Link>
            <Link 
              to="/manage-bookings" 
              className={`${activePage === 'manage-bookings' ? 'text-purple-400 hover:text-purple-300' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Manage Bookings
            </Link>
            <Link 
              to="/manage-rooms" 
              className={`${activePage === 'manage-rooms' ? 'text-purple-400 hover:text-purple-300' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Manage Rooms
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center">
              <span className="text-white font-medium">
                {firstName?.charAt(0) || "U"}
              </span>
            </div>
            <span>{firstName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
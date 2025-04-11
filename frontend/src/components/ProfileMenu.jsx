import React, { useState, useContext } from 'react';
import { User, Settings, LogOut, Edit } from 'lucide-react';
import { AuthContext } from '../context/AuthProvider'; // Import your AuthContext

function ProfileMenu() {
  const { user, logout } = useContext(AuthContext); // Access user and logout from context
  const userName = user?.first_name || 'User';
  const userEmail = user?.email || 'user@example.com';

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleEditProfile = () => {
    console.log('Edit Profile clicked');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleProfile}
        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
      >
        <div className="h-8 w-8 bg-plek-purple rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-white" />
        </div>
      </button>

      {/* Profile Popup */}
      {isProfileOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            {/* <p className="text-sm text-gray-500">{userEmail}</p> */}
          </div>

          <button
            onClick={handleEditProfile}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={handleSettings}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <div className="border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
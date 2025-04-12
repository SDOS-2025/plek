import React, { useState, useContext, useEffect, useRef } from 'react';
import { User, Settings, LogOut, Edit } from 'lucide-react';
import { AuthContext } from '../context/AuthProvider';

function ProfileMenu() {
  const { user, logout } = useContext(AuthContext);
  const userName = user?.first_name || 'User';
  const userEmail = user?.email || 'user@example.com';
  const menuRef = useRef(null);
  
  // Get initials for avatar
  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user?.first_name) {
      return user.first_name[0].toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleEditProfile = () => {
    console.log('Edit Profile clicked');
    setIsProfileOpen(false);
  };

  const handleSettings = () => {
    console.log('Settings clicked');
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleProfile}
        className="flex items-center justify-center"
        aria-label="Open profile menu"
        aria-expanded={isProfileOpen}
        aria-haspopup="true"
      >
        <div className="h-8 w-8 bg-plek-purple rounded-full flex items-center justify-center hover:opacity-90 transition-all hover:shadow-md">
          {user?.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt={`${userName}'s profile`} 
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">{getInitials()}</span>
          )}
        </div>
      </button>

      {/* Profile Popup */}
      {isProfileOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-plek-dark rounded-lg shadow-lg py-1 z-10 border border-gray-700 transition-all duration-200 transform origin-top-right"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="profile-menu"
        >
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">{userEmail}</p>
          </div>

          <button
            onClick={handleEditProfile}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-150"
            role="menuitem"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={handleSettings}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-150"
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <div className="border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-150"
              role="menuitem"
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
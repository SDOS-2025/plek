import React, { useState, useContext, useEffect, useRef } from "react";
import { User, LogOut, Edit, Camera, Key, Save, X } from "lucide-react";
import { AuthContext } from "../context/AuthProvider";
import api from "../api";

function ProfileMenu() {
  const { user, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);
  const profileEditRef = useRef(null);

  // Profile edit states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editMode, setEditMode] = useState(null);

  // Form data for profile editing
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profilePicture: null,
  });

  // Fetch user data when profile popup is opened
  useEffect(() => {
    if (isProfileOpen && !userData) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const response = await api.get("/api/accounts/profile/");
          if (response.status === 200) {
            setUserData(response.data);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [isProfileOpen, userData]);

  // Initialize form data when user data is loaded
  useEffect(() => {
    if (userData) {
      setFormData((prevData) => ({
        ...prevData,
        firstName: userData.first_name || "",
        lastName: userData.last_name || "",
      }));
    }
  }, [userData]);

  // Get full profile picture URL with backend domain
  const getProfilePictureUrl = () => {
    // Check if we have a profile picture URL
    const profilePicture = userData?.profile_picture || user?.profile_picture;
    
    if (!profilePicture) return null;
    
    // If it's already a full URL (starts with http), return it as is
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    
    // Otherwise, prepend the backend URL
    // Make sure this matches your backend URL in development/production
    const backendUrl = 'http://localhost:8000';
    return `${backendUrl}${profilePicture}`;
  };

  // Get display name
  const getDisplayName = () => {
    if (loading) return "Loading...";
    if (userData?.first_name) return userData.first_name;
    if (user?.first_name) return user.first_name;
    return "User";
  };

  // Get user email
  const getUserEmail = () => {
    if (loading) return "Loading...";
    if (userData?.email) return userData.email;
    if (user?.email) return user.email;
    return "user@example.com";
  };

  // Get initials for avatar
  const getInitials = () => {
    if (userData?.first_name && userData?.last_name) {
      return `${userData.first_name[0]}${userData.last_name[0]}`.toUpperCase();
    } else if (userData?.first_name) {
      return userData.first_name[0].toUpperCase();
    } else if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user?.first_name) {
      return user.first_name[0].toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }

      if (
        profileEditRef.current &&
        !profileEditRef.current.contains(event.target)
      ) {
        setShowEditProfile(false);
        setEditMode(null);
      }
    };

    if (isProfileOpen || showEditProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen, showEditProfile]);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
    setIsProfileOpen(false);
  };

  const handleEditMode = (mode) => {
    setEditMode(mode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleProfilePictureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prevData) => ({
        ...prevData,
        profilePicture: e.target.files[0],
      }));
    }
  };

  const handleSaveChanges = async () => {
    try {
      let endpoint = "/api/accounts/profile/";
      let data = new FormData();
      let config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editMode === "name") {
        data.append("first_name", formData.firstName);
        data.append("last_name", formData.lastName);
      } else if (editMode === "password") {
        // Different endpoint for password change
        endpoint = "/api/accounts/password/change/";
        data.append("old_password", formData.currentPassword);
        data.append("new_password1", formData.newPassword);
        data.append("new_password2", formData.confirmPassword);
        // Regular JSON for password changes, not FormData
        config = {};
      } else if (editMode === "picture" && formData.profilePicture) {
        data.append("profile_picture", formData.profilePicture);
      }

      const response = await api.patch(endpoint, data, config);

      if (response.status === 200) {
        // Update local user data
        if (editMode === "name") {
          setUserData((prev) => ({
            ...prev,
            first_name: formData.firstName || prev.first_name,
            last_name: formData.lastName || prev.last_name,
          }));
        } else if (editMode === "picture" && response.data.profile_picture) {
          // Update the profile picture in userData
          setUserData((prev) => ({
            ...prev,
            profile_picture: response.data.profile_picture
          }));
          
          // Also update in localStorage if that's where it's being stored
          if (localStorage.getItem("user")) {
            const storedUser = JSON.parse(localStorage.getItem("user"));
            storedUser.profile_picture = response.data.profile_picture;
            localStorage.setItem("user", JSON.stringify(storedUser));
          }
        }

        // Show success feedback
        alert("Profile updated successfully");
        
        // Clear form and close edit mode
        if (editMode === "picture") {
          setFormData(prev => ({ ...prev, profilePicture: null }));
        }
        setEditMode(null);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMessage = "Failed to update profile";
      
      if (error.response) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        }
      }
      
      alert(errorMessage);
    }
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
          {getProfilePictureUrl() ? (
            <img
              src={getProfilePictureUrl()}
              alt={`${getDisplayName()}'s profile`}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">
              {getInitials()}
            </span>
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
            <p className="text-sm font-medium text-white truncate">
              {getDisplayName()}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {getUserEmail()}
            </p>
          </div>

          <button
            onClick={handleEditProfile}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-150"
            role="menuitem"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
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

      {/* Edit Profile Popup */}
      {showEditProfile && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
          onClick={() => setShowEditProfile(false)}
        >
          <div
            className="bg-plek-dark rounded-lg shadow-lg p-6 w-full max-w-md mx-4 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
            ref={profileEditRef}
          >
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
              <h3 className="text-lg font-medium text-white">Edit Profile</h3>
              <button
                onClick={() => setShowEditProfile(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="relative">
                  <div className="h-20 w-20 bg-plek-purple rounded-full flex items-center justify-center">
                    {getProfilePictureUrl() ? (
                      <img
                        src={getProfilePictureUrl()}
                        alt="Profile Picture"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-medium">
                        {getInitials()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Edit Options */}
              {!editMode && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleEditMode("name")}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center">
                      <User className="h-5 w-5 mr-3 text-gray-400" />
                      <span className="text-gray-300">Change Name</span>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </button>

                  <button
                    onClick={() => handleEditMode("picture")}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center">
                      <Camera className="h-5 w-5 mr-3 text-gray-400" />
                      <span className="text-gray-300">
                        Change Profile Picture
                      </span>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </button>

                  <button
                    onClick={() => handleEditMode("password")}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center">
                      <Key className="h-5 w-5 mr-3 text-gray-400" />
                      <span className="text-gray-300">Change Password</span>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}

              {/* Change Name Form */}
              {editMode === "name" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-plek-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-plek-purple"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setEditMode(null)}
                      className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 bg-plek-purple hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Change Password Form */}
              {editMode === "password" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-plek-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-plek-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full p-2.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-plek-purple"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setEditMode(null)}
                      className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 bg-plek-purple hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                      disabled={
                        !formData.currentPassword ||
                        !formData.newPassword ||
                        formData.newPassword !== formData.confirmPassword
                      }
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Change Password
                    </button>
                  </div>
                </div>
              )}

              {/* Change Profile Picture Form */}
              {editMode === "picture" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Upload Profile Picture
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      id="profile-picture-upload"
                    />
                    <label
                      htmlFor="profile-picture-upload"
                      className="cursor-pointer px-4 py-8 border-2 border-dashed border-gray-600 rounded-lg w-full text-center hover:border-plek-purple transition-colors"
                    >
                      <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <span className="text-gray-300 block">
                        {formData.profilePicture
                          ? `Selected: ${formData.profilePicture.name}`
                          : "Click to select an image"}
                      </span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setEditMode(null)}
                      className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 bg-plek-purple hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                      disabled={!formData.profilePicture}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Upload Picture
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;

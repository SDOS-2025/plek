import React, { createContext, useState, useEffect } from "react";
import api from "../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const fetchInitialCsrfToken = async () => {
      try {
        await api.ensureCsrfToken();
      } catch (err) {
        console.error("Failed to fetch initial CSRF token:", err);
      }
    };
    fetchInitialCsrfToken();
  }, []);

  // Function to check auth status that can be called multiple times
  const checkAuth = async () => {
    try {
      console.log("checkAuth: Attempting to fetch /api/auth/user/");
      setLoading(true);
      const response = await api.get("/api/auth/user");
      console.log("checkAuth: Success - Response:", response.data);
      
      // Get the additional profile data to ensure we have the profile picture
      try {
        const profileResponse = await api.get("/api/accounts/profile/");
        console.log("checkAuth: Fetched complete profile:", profileResponse.data);
        
        // Merge the authentication data with the profile data
        const completeUserData = {
          ...response.data,
          ...profileResponse.data,
          // Ensure the profile picture URL is included
          profile_picture: profileResponse.data.profile_picture
        };
        
        setUser(completeUserData);
      } catch (profileErr) {
        console.error("checkAuth: Failed to fetch profile:", profileErr);
        // Fall back to just the auth data if profile fetch fails
        setUser(response.data);
      }
      
      return true;
    } catch (err) {
      console.error(
        "checkAuth: Failed - Error:",
        err.response?.data || err.message
      );
      setUser(null);
      return false;
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  // Initial auth check on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for URL changes which might indicate an OAuth redirect has happened
  useEffect(() => {
    const handleRouteChange = () => {
      // If we're on the dashboard and haven't confirmed auth yet, check again
      if (window.location.pathname === '/dashboard' && !user && authChecked) {
        console.log("Route changed to dashboard, rechecking auth...");
        checkAuth();
      }
    };

    // Check immediately on mount
    handleRouteChange();

    // Also add a listener for history changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [user, authChecked]);

  const login = async ({ email, password, social = false, socialData }) => {
    try {
      let userData;
      
      if (social) {
        console.log("login: Attempting social login with /api/auth/google/");
        const response = await api.post("/api/auth/google/", socialData);
        console.log("login: Social login success - Response:", response.data);
        userData = response.data.user;
      } else {
        console.log("login: Attempting to post /api/auth/login/");
        const response = await api.post("/api/auth/login", { email, password });
        console.log("login: Success - Response:", response.data);
        userData = response.data;
      }
      
      // After successful login, fetch the complete user profile to ensure we have
      // all profile data including the profile picture URL
      try {
        const profileResponse = await api.get("/api/accounts/profile/");
        console.log("Fetched complete user profile:", profileResponse.data);
        
        // Merge login data with complete profile data
        userData = { 
          ...userData, 
          ...profileResponse.data,
          // Ensure the profile picture URL is included
          profile_picture: profileResponse.data.profile_picture
        };
      } catch (profileErr) {
        console.error("Failed to fetch complete profile after login:", profileErr);
        // Continue with the login data we have
      }
      
      // Update user state with complete profile data
      setUser(userData);
      return userData;
    } catch (err) {
      console.error(
        "login: Failed - Error:",
        err.response?.data || err.message
      );
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log("logout: Attempting to post /api/auth/logout/");
      await api.post("/api/auth/logout");
      setUser(null);
      document.cookie = "plek-access=; Max-Age=0; path=/;";
      document.cookie = "plek-refresh=; Max-Age=0; path=/;";
      document.cookie = "csrftoken=; Max-Age=0; path=/;";
    } catch (err) {
      console.error(
        "logout: Failed - Error:",
        err.response?.data || err.message
      );
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

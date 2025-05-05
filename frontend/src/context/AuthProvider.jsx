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
      setUser(response.data);
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
      if (social) {
        console.log("login: Attempting social login with /api/auth/google/");
        const response = await api.post("/api/auth/google/", socialData);
        console.log("login: Social login success - Response:", response.data);
        setUser(response.data.user);
        return response.data;
      } else {
        console.log("login: Attempting to post /api/auth/login/");
        const response = await api.post("/api/auth/login", { email, password });
        console.log("login: Success - Response:", response.data);
        setUser(response.data);
        return response.data;
      }
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

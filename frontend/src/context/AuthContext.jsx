import React, { createContext, useState, useEffect } from "react";
import api from "../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);

  const checkAuth = async () => {
    try {
      console.log("checkAuth: Attempting to fetch /api/auth/user/");
      const response = await api.get("/api/auth/user/");
      console.log("checkAuth: Success - Response:", response.data);
      setIsAuthenticated(true);
      setUser(response.data); // User data directly from response
      return response.data;
    } catch (err) {
      console.error("checkAuth: Failed - Error:", err.response?.data || err.message);
      setIsAuthenticated(false);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    console.log("AuthProvider: Initial checkAuth on mount");
    checkAuth();
  }, []);

  const logout = () => {
      console.log("logout: Sending /api/auth/logout/");
      api.post("/api/auth/logout/").catch((err) => {
        console.error("logout: Failed - Error:", err.response?.data || err.message);
      }
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("FirstName");
      console.log("logout: Success");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

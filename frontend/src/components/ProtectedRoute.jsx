import React from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const { isAuthenticated } = useContext(AuthContext);
  console.log("ProtectedRoute - isAuthenticated:", isAuthenticated);

  if (isAuthenticated === null) {
    console.log("ProtectedRoute - Showing loading state");
    return (
      <div className="min-h-screen bg-plek-background flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

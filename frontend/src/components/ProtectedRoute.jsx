import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthProvider";

const ProtectedRoute = () => {
    const { user, loading } = useContext(AuthContext);

  if (loading) {
    console.log("ProtectedRoute - Showing loading state");
    return (
      <div className="min-h-screen bg-plek-background flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

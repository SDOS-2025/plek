import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";

// User Pages
import Login from "./pages/user/Login";
import Signup from "./pages/user/Signup";
import ForgotPassword from "./pages/user/ForgotPassword";
import ResetPassword from "./pages/user/ResetPassword";
import Dashboard from "./pages/user/Dashboard";
import Booking from "./pages/user/Booking";
import MyBookings from "./pages/user/MyBookings";
import ChatBot from "./pages/user/ChatBot";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import ManageBookings from "./pages/admin/ManageBookings";
import ManageRooms from "./pages/admin/ManageRooms";
import ManageUsers from "./pages/admin/ManageUsers";
import Analytics from "./pages/admin/Analytics";
import AdminManageConfig from "./pages/admin/AdminManageConfig";
import InstitutePolicies from "./pages/admin/InstitutePolicies";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* User Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/chatbot" element={<ChatBot />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/manage-bookings" element={<ManageBookings />} />
        <Route path="/admin/manage-rooms" element={<ManageRooms />} />
        <Route path="/admin/manage-users" element={<ManageUsers />} />
        <Route path="/admin/manage-config" element={<AdminManageConfig />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route
          path="/admin/institute-policies"
          element={<InstitutePolicies />}
        />
      </Route>
    </Routes>
  );
}

export default App;

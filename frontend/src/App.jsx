import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/login';
import Signup from './pages/signup';
import Booking from './pages/booking';
import MyBookings from './pages/MyBookings';
import ManageBookings from './pages/ManageBookings';
import ManageRooms from './pages/ManageRooms';
import LandingPage from './pages/landingPage';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/booking" element={<Booking />} />
                        <Route path="/my-bookings" element={<MyBookings />} />
                        <Route path="/manage-bookings" element={<ManageBookings />} />
                        <Route path="/manage-rooms" element={<ManageRooms />} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;

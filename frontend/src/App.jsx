import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import Login from './pages/login';
import Signup from './pages/signup';
import Dashboard from './pages/Dashboard';
import Booking from './pages/booking';
import ManageBookings from './pages/ManageBookings';
import ManageRooms from './pages/ManageRooms';
import MyBookings from './pages/MyBookings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/MyBookings" element={<MyBookings />} />
        <Route path="/ManageBookings" element={<ManageBookings />} />
        <Route path="/ManageRooms" element={<ManageRooms />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
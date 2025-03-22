import React from 'react';
import { BrowserRouter, Link } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Signup from './pages/signup';
import Dashboard from './pages/Dashboard';
import Booking from './pages/booking'; 
import ManageBookings from './pages/ManageBookings';
import MyBookings from './pages/MyBookings';  




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/booking" element={<Booking/>} />
        <Route path="ManageBookings" element={<ManageBookings />} />
        <Route path="MyBookings" element={<MyBookings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
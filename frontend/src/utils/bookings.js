/**
 * Utility functions for working with bookings
 */

import { isFutureDate } from './dates';

/**
 * Categorizes booking status into CSS color classes
 * 
 * @param {string} status - Booking status (APPROVED, PENDING, REJECTED, CANCELLED)
 * @returns {string} CSS color class
 */
export const getStatusColorClass = (status) => {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'approved') return 'text-green-400';
  if (statusLower === 'pending') return 'text-yellow-400';
  if (statusLower === 'rejected' || statusLower === 'cancelled') return 'text-red-400';
  return 'text-gray-400';
};

/**
 * Process booking data from API for consistent format in the UI
 * 
 * @param {Object} booking - Raw booking data from API
 * @returns {Object} Processed booking object with formatted fields
 */
export const processBookingData = (booking) => {
  const { formatDate, formatTimeSlot } = require('./dates');
  
  return {
    id: booking.id,
    roomName: booking.room.name,
    building: booking.room.building_name,
    capacity: booking.room.capacity,
    status: booking.status,
    purpose: booking.purpose,
    participants: booking.participants,
    date: formatDate(booking.start_time),
    slot: formatTimeSlot(booking.start_time, booking.end_time),
    startTime: booking.start_time,
    endTime: booking.end_time,
    amenities: booking.room.amenities,
    originalBooking: booking, // Keep the original data for reference
  };
};

/**
 * Filter bookings into upcoming and previous categories
 * 
 * @param {Array} bookings - Array of booking objects
 * @returns {Object} Object with upcoming and previous bookings arrays
 */
export const categorizeBookings = (bookings) => {
  const upcoming = [];
  const previous = [];
  
  bookings.forEach(booking => {
    // Put cancelled or rejected bookings in previous, regardless of date
    if (['cancelled', 'rejected'].includes(booking.status.toLowerCase())) {
      previous.push(booking);
    }
    // For other bookings, use date to categorize
    else if (isFutureDate(booking.startTime)) {
      upcoming.push(booking);
    } else {
      previous.push(booking);
    }
  });
  
  // Sort upcoming bookings by date (closest first)
  upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  // Sort previous bookings by date (most recent first)
  previous.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  return { upcoming, previous };
};
/**
 * Utility functions for handling institute policies
 */

import api from "../api";

// Cache for institute policies to avoid frequent API calls
let policyCache = null;
let lastFetchTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetch institute policies from the backend - use this for read-only access
 * @returns {Promise<Object>} The institute policies
 */
export const fetchInstitutePolicies = async () => {
  try {
    const response = await api.get('/api/settings/public-policies/');
    return response.data;
  } catch (error) {
    console.error('Error fetching institute policies:', error);
    throw error;
  }
};

/**
 * Fetch institute policies from the admin endpoint - use this for admin access
 * @returns {Promise<Object>} The institute policies
 */
export const fetchInstitutePoliciesAdmin = async () => {
  try {
    // Use the admin endpoint for full access
    const response = await api.get("/settings/policies/");
    if (response.status === 200) {
      // Update the cache too
      policyCache = response.data;
      lastFetchTime = Date.now();
      return response.data;
    }
  } catch (error) {
    console.error("Failed to fetch institute policies (admin):", error);
    throw error;
  }
};

/**
 * Update institute policies - admin only
 * @param {Object} policyData - The updated policy data
 * @returns {Promise<Object>} The updated policies
 */
export const updateInstitutePolicies = async (policyData) => {
  try {
    const response = await api.post('/settings/policies/', policyData);
    return response.data;
  } catch (error) {
    console.error('Error updating institute policies:', error);
    throw error;
  }
};

/**
 * Get default institute policies as fallback
 * @returns {Object} Default institute policies
 */
export const getDefaultPolicies = () => {
  return {
    booking_opening_days: 30,
    max_booking_duration_hours: 4,
    min_gap_between_bookings_minutes: 15,
    working_hours_start: "08:00:00",
    working_hours_end: "19:00:00",
    allow_backdated_bookings: false,
    enable_auto_approval: false,
    approval_window_hours: 48
  };
};

/**
 * Generate time slots based on institute policies
 * @param {Object} policy - The institute policy object containing working_hours_start and working_hours_end
 * @param {number} slotDurationMinutes - Duration of each slot in minutes (default: 60)
 * @returns {Array<string>} Array of time slots in format "HH:MM AM/PM - HH:MM AM/PM"
 */
export const generateTimeSlotsFromPolicy = (policy, slotDurationMinutes = 60) => {
  if (!policy || !policy.working_hours_start || !policy.working_hours_end) {
    // Fallback to default working hours if policy is not available
    return generateTimeSlots('08:00', '19:00', slotDurationMinutes);
  }

  return generateTimeSlots(
    policy.working_hours_start.substring(0, 5), 
    policy.working_hours_end.substring(0, 5), 
    slotDurationMinutes
  );
};

/**
 * Generates time slots based on start and end times
 * 
 * @param {string} startTime - Start time in 24h format "HH:MM"
 * @param {string} endTime - End time in 24h format "HH:MM"
 * @param {number} slotDurationMinutes - Duration of each slot in minutes
 * @returns {Array<string>} Array of time slots in format "HH:MM AM/PM - HH:MM AM/PM"
 */
export const generateTimeSlots = (startTime, endTime, slotDurationMinutes = 60) => {
  const timeSlots = [];
  
  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Convert to minutes since midnight for easier calculation
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Generate time slots
  for (let i = startMinutes; i < endMinutes; i += slotDurationMinutes) {
    // Calculate slot start and end times
    const slotStartMinutes = i;
    const slotEndMinutes = Math.min(i + slotDurationMinutes, endMinutes);
    
    // Skip if the slot is too short (less than half the duration)
    if (slotEndMinutes - slotStartMinutes < slotDurationMinutes / 2) {
      continue;
    }
    
    // Format the time slot
    const formattedStartTime = formatTime(slotStartMinutes);
    const formattedEndTime = formatTime(slotEndMinutes);
    
    timeSlots.push(`${formattedStartTime} - ${formattedEndTime}`);
  }
  
  return timeSlots;
};

/**
 * Formats minutes since midnight to "HH:MM AM/PM" format
 * 
 * @param {number} minutesSinceMidnight - Minutes since midnight
 * @returns {string} Formatted time string in "HH:MM AM/PM" format
 */
const formatTime = (minutesSinceMidnight) => {
  const hours = Math.floor(minutesSinceMidnight / 60);
  const minutes = minutesSinceMidnight % 60;
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  // Format the time string with leading zeros for minutes
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Validate booking against institute policies
 * @param {Object} booking - Booking data
 * @param {Object} policies - Institute policies
 * @returns {Object} Validation result {valid: boolean, message: string}
 */
export const validateBookingAgainstPolicy = (booking, policies) => {
  const result = { valid: true, message: "" };
  
  // Example validation: check if booking duration exceeds max_booking_duration_hours
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const durationHours = (endTime - startTime) / (1000 * 60 * 60);
  
  if (durationHours > policies.max_booking_duration_hours) {
    result.valid = false;
    result.message = `Booking duration exceeds the maximum allowed (${policies.max_booking_duration_hours} hours)`;
    return result;
  }
  
  // Add more policy validations as needed
  
  return result;
};
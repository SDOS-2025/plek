/**
 * Utility functions for date and time handling
 */

import { DateTime } from "luxon";

/**
 * The timezone used throughout the application
 */
export const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Formats a date string to a human-readable format
 * 
 * @param {string} dateString - ISO date string
 * @param {string} format - Luxon format string (default: "LLLL d, yyyy")
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, format = "LLLL d, yyyy") => {
  return DateTime.fromISO(dateString, { zone: APP_TIMEZONE }).toFormat(format);
};

/**
 * Formats a time string to a human-readable format
 * 
 * @param {string} timeString - ISO date string
 * @param {string} format - Luxon format string (default: "h:mm a")
 * @returns {string} Formatted time string
 */
export const formatTime = (timeString, format = "h:mm a") => {
  return DateTime.fromISO(timeString, { zone: APP_TIMEZONE }).toFormat(format);
};

/**
 * Generates a time slot string from start and end time strings
 * 
 * @param {string} startTimeString - ISO date string for start time
 * @param {string} endTimeString - ISO date string for end time
 * @returns {string} Time slot string in format "start time - end time"
 */
export const formatTimeSlot = (startTimeString, endTimeString) => {
  const startTime = DateTime.fromISO(startTimeString, { zone: APP_TIMEZONE });
  const endTime = DateTime.fromISO(endTimeString, { zone: APP_TIMEZONE });
  
  return `${startTime.toFormat("h a")} - ${endTime.toFormat("h a")}`;
};

/**
 * Determines if a date is in the future
 * 
 * @param {string} dateString - ISO date string
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (dateString) => {
  const date = DateTime.fromISO(dateString, { zone: APP_TIMEZONE });
  const now = DateTime.now().setZone(APP_TIMEZONE);
  return date > now;
};
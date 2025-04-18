/**
 * Utility functions for formatting and text transformations
 */

/**
 * Properly capitalizes amenity names, handling special cases like "WiFi", "TV", etc.
 * 
 * @param {string} name - The amenity name to format
 * @returns {string} Properly formatted amenity name
 */
export const formatAmenityName = (name) => {
  if (!name) return "";

  // Handle special cases like "TV", "WiFi", etc.
  const specialCases = {
    wifi: "WiFi",
    tv: "TV",
    hdmi: "HDMI",
    usb: "USB",
    ac: "AC",
  };

  const lowerName = name.toLowerCase();
  if (specialCases[lowerName]) {
    return specialCases[lowerName];
  }

  // Otherwise capitalize first letter of each word
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
/**
 * Utility functions for UI components and presentation
 */

/**
 * Shows an alert for a specified duration, then automatically hides it
 * 
 * @param {Function} setAlertState - State setter function for the alert
 * @param {string} type - Alert type ('success', 'danger', 'warning')
 * @param {string} message - Alert message
 * @param {number} duration - Duration in milliseconds before auto-hiding (default: 5000)
 */
export const showTemporaryAlert = (setAlertState, type, message, duration = 5000) => {
  setAlertState({ 
    show: true, 
    type, 
    message 
  });
  
  setTimeout(() => {
    setAlertState(prev => ({ ...prev, show: false }));
  }, duration);
};

/**
 * Filter items based on a search query across multiple fields
 * 
 * @param {Array} items - Array of items to filter
 * @param {string} query - Search query
 * @param {Array} fields - Array of field names to search within each item
 * @returns {Array} Filtered array of items
 */
export const filterItemsBySearchQuery = (items, query, fields) => {
  if (!query) return items;
  
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => 
    fields.some(field => {
      // Handle nested fields with dot notation (e.g., "room.name")
      if (field.includes('.')) {
        const parts = field.split('.');
        let value = item;
        
        for (const part of parts) {
          if (!value || typeof value !== 'object') return false;
          value = value[part];
        }
        
        return value && String(value).toLowerCase().includes(lowerQuery);
      }
      
      // Handle direct fields
      return item[field] && String(item[field]).toLowerCase().includes(lowerQuery);
    })
  );
};

/**
 * Generates array of capacity range options for UI select elements
 * 
 * @returns {Array} Array of capacity range objects
 */
export const getCapacityRanges = () => [
  { label: "All", value: "all" },
  { label: "1-50", value: "1-50", min: 1, max: 50 },
  { label: "51-100", value: "51-100", min: 51, max: 100 },
  { label: "101-200", value: "101-200", min: 101, max: 200 },
  { label: "200+", value: "200+", min: 200, max: Infinity },
];
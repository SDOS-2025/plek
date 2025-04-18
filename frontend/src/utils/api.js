/**
 * Utility functions for API and data fetching operations
 */

/**
 * Extracts error messages from API error responses
 * 
 * @param {Error} error - Error object from API call
 * @param {string} defaultMessage - Default message to show if error can't be parsed
 * @returns {string} Human-readable error message
 */
export const getErrorMessage = (error, defaultMessage = "An error occurred. Please try again.") => {
  if (!error || !error.response) {
    return defaultMessage;
  }
  
  const { data, status } = error.response;
  
  // Network or server errors
  if (status >= 500) {
    return "Server error. Please try again later.";
  }
  
  // Authentication errors
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }
  
  // Permission errors
  if (status === 403) {
    return "You don't have permission to perform this action.";
  }
  
  // Handle common response formats
  if (data) {
    // Django Rest Framework error format with non_field_errors
    if (data.non_field_errors && data.non_field_errors.length) {
      return data.non_field_errors[0];
    }
    
    // Django Rest Framework error with single field errors
    if (data.detail) {
      return data.detail;
    }
    
    // Generic error message in data.error
    if (data.error) {
      return data.error;
    }
    
    // Handle field-specific errors by returning the first one
    const fieldErrors = Object.entries(data)
      .filter(([key, value]) => Array.isArray(value))
      .map(([key, value]) => value[0]);
    
    if (fieldErrors.length > 0) {
      return fieldErrors[0];
    }
  }
  
  return defaultMessage;
};

/**
 * Creates a standardized data fetching function with consistent error handling
 * 
 * @param {Function} apiCall - Function that makes the API call
 * @param {Function} onSuccess - Callback function when API call succeeds
 * @param {Function} onError - Callback function when API call fails
 * @param {Function} onFinally - Callback function that always runs after API call
 * @returns {Function} Wrapped function that handles API calls consistently
 */
export const createApiHandler = (apiCall, onSuccess, onError, onFinally) => {
  return async (...args) => {
    try {
      const response = await apiCall(...args);
      if (onSuccess) {
        onSuccess(response.data);
      }
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (onError) {
        onError(errorMessage, error);
      }
      throw error;
    } finally {
      if (onFinally) {
        onFinally();
      }
    }
  };
};
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: true,
});

// Function to fetch CSRF token
const getCsrfToken = async () => {
  try {
    // This endpoint sets the CSRF cookie
    await axios.get("http://127.0.0.1:8000/api/csrf/", {
      withCredentials: true
    });
    
    // Extract the token from cookies - make sure to match the name in Django settings (CSRF_COOKIE_NAME)
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    return null;
  }
};

api.interceptors.request.use(async (config) => {
  // For non-GET requests, include CSRF token
  if (config.method !== "get") {
    // Try to get token from cookie - use lowercase 'csrftoken' to match Django default
    let csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
    
    // If token not found in cookie, fetch it
    if (!csrfToken) {
      csrfToken = await getCsrfToken();
    }
    
    if (csrfToken) {
      // Use X-CSRFToken header as per Django's CSRF_HEADER_NAME setting
      config.headers["X-CSRFTOKEN"] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("Response:", response.config.url, response.status);
    if (response.data && response.data.refresh) {
      console.log("Setting cookies");
      const refreshToken = response.data.refresh;
      document.cookie = `plek-refresh=${refreshToken}; path=/; samesite=strict`;
    }
    return response;
  },
  async (error) => {
    console.error("Error:", error);
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        // Get fresh CSRF token before token refresh request
        await getCsrfToken();
        
        const response = await axios.post(
          "http://127.0.0.1:8000/api/auth/token/refresh",
          {},
          { withCredentials: true }
        );
        const newAccessToken = response.data.access;
        const refreshToken = response.data.refresh;
        document.cookie = `plek-access=${newAccessToken}; path=/; samesite=strict`;
        document.cookie = `plek-refresh=${refreshToken}; path=/; samesite=strict`;
        return api(originalRequest);
      } catch (err) {
        console.error("Refresh token failed:", err.response?.data);
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  },
);

// Add a method to ensure we have a CSRF token
api.ensureCsrfToken = async () => {
  return await getCsrfToken();
};

export default api;

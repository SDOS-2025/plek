import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

// Function to fetch CSRF token
const getCsrfToken = async () => {
  try {
    // This endpoint sets the CSRF cookie
    await axios.get("http://localhost:8000/api/auth/csrf/", {
      withCredentials: true,
    });
    // Extract the token from cookies
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
    let csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
    if (!csrfToken) {
      csrfToken = await getCsrfToken();
    }
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("Response:", response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error("Error:", error);
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await getCsrfToken();
        const response = await axios.post(
          "http://localhost:8000/api/auth/token/refresh/",
          {},
          { withCredentials: true }
        );
        // dj_rest_auth sets cookies automatically, no need to set manually
        return api(originalRequest);
      } catch (err) {
        console.error("Refresh token failed:", err.response?.data);
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

// Add a method to ensure we have a CSRF token
api.ensureCsrfToken = async () => {
  return await getCsrfToken();
};


export default api;
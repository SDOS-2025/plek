import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.method != "get") {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
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
      error.response.status === 401 &&
      !originalRequest._retry &&
      error.response
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          "http://127.0.0.1:8000/api/auth/token/refresh",
          {},
          {
            withCredentials: true,
          },
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

export default api;

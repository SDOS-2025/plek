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

// User Auth and Profile Management
export const registerUser = async (userData) => {
  const response = await api.post("/api/auth/registration/", userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post("/api/auth/login/", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/api/auth/logout/");
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/api/accounts/profile/");
  return response.data;
};

// Room Management
export const listRooms = async (params) => {
  const response = await api.get("/api/rooms/", { params });
  return response.data;
};

export const getRoom = async (roomId) => {
  const response = await api.get(`/api/rooms/${roomId}/`);
  return response.data;
};

export const createRoom = async (roomData) => {
  const response = await api.post("/api/rooms/", roomData);
  return response.data;
};

export const updateRoom = async (roomId, roomData) => {
  const response = await api.patch(`/api/rooms/${roomId}/`, roomData);
  return response.data;
};

export const deleteRoom = async (roomId) => {
  const response = await api.delete(`/api/rooms/${roomId}/`);
  return response.data;
};

// Building, Floor, Department, and Amenity Management
export const listBuildings = async () => {
  const response = await api.get("/api/buildings/");
  return response.data;
};

export const listFloors = async () => {
  const response = await api.get("/api/floors/");
  return response.data;
};

export const listDepartments = async () => {
  const response = await api.get("/api/departments/");
  return response.data;
};

export const listAmenities = async () => {
  const response = await api.get("/api/amenities/");
  return response.data;
};

// Booking Management
export const listBookings = async () => {
  const response = await api.get("/api/bookings/");
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await api.post("/api/bookings/create/", bookingData);
  return response.data;
};

export const getBooking = async (bookingId) => {
  const response = await api.get(`/api/bookings/${bookingId}/`);
  return response.data;
};

export const updateBooking = async (bookingId, bookingData) => {
  const response = await api.patch(`/api/bookings/${bookingId}/`, bookingData);
  return response.data;
};

export const cancelBooking = async (bookingId, reason) => {
  const response = await api.delete(`/api/bookings/${bookingId}/`, { 
    data: { cancellation_reason: reason } 
  });
  return response.data;
};

export const approveBooking = async (bookingId) => {
  const response = await api.post(`/api/bookings/approval/${bookingId}/`, {
    action: "approve",
  });
  return response.data;
};

export const rejectBooking = async (bookingId, reason) => {
  const response = await api.post(`/api/bookings/approval/${bookingId}/`, {
    action: "reject",
    cancellation_reason: reason,
  });
  return response.data;
};

// Google Calendar Integration
export const listUserCalendars = async () => {
  const response = await api.get("/api/bookings/calendar/");
  return response.data;
};

export const getBookingCalendarEvent = async (bookingId) => {
  const response = await api.get(`/api/bookings/${bookingId}/calendar/`);
  return response.data;
};

export const addBookingToCalendar = async (bookingId, calendarId) => {
  const response = await api.post(`/api/bookings/${bookingId}/calendar/`, {
    calendar_id: calendarId
  });
  return response.data;
};

export const updateCalendarEvent = async (bookingId) => {
  const response = await api.put(`/api/bookings/${bookingId}/calendar/`);
  return response.data;
};

export const removeBookingFromCalendar = async (bookingId) => {
  const response = await api.delete(`/api/bookings/${bookingId}/calendar/`);
  return response.data;
};

export default api;
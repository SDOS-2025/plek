import React, { useState, useEffect } from "react";
import {
  Settings,
  CalendarDays,
  Clock,
  Check,
  X,
  Save,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import {
  fetchInstitutePoliciesAdmin,
  updateInstitutePolicies,
} from "../../utils/institutePolicies";

const InstitutePolicies = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [policies, setPolicies] = useState({
    booking_opening_days: 30,
    max_booking_duration_hours: 4,
    min_gap_between_bookings_minutes: 15,
    working_hours_start: "08:00",
    working_hours_end: "19:00",
    allow_backdated_bookings: false,
    enable_auto_approval: false,
    approval_window_hours: 48,
  });

  // Format the time to HH:MM for the time inputs
  const formatTimeForInput = (timeStr) => {
    if (!timeStr) return "";
    // If already in HH:MM format, return as is
    if (timeStr.length === 5) return timeStr;

    // Otherwise assume it's from API in HH:MM:SS format
    return timeStr.substring(0, 5);
  };

  // Initial load
  useEffect(() => {
    const loadPolicies = async () => {
      try {
        setLoading(true);
        const data = await fetchInstitutePoliciesAdmin();

        // Format time values for input fields
        const formattedData = {
          ...data,
          working_hours_start: formatTimeForInput(data.working_hours_start),
          working_hours_end: formatTimeForInput(data.working_hours_end),
        };

        setPolicies(formattedData);
        setError(null);
      } catch (err) {
        console.error("Failed to load institute policies", err);
        setError(
          "Failed to load policies. Please check your permissions and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPolicies();
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPolicies({
      ...policies,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? parseInt(value)
          : value,
    });
  };

  // Save changes
  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Prepare data for API, ensure time fields have seconds for consistency
      const apiData = {
        ...policies,
        working_hours_start: policies.working_hours_start.includes(":")
          ? policies.working_hours_start
          : `${policies.working_hours_start}:00`,
        working_hours_end: policies.working_hours_end.includes(":")
          ? policies.working_hours_end
          : `${policies.working_hours_end}:00`,
      };

      await updateInstitutePolicies(apiData);
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to save institute policies", err);
      setError("Failed to save policies. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Reload policies from server
  const handleReload = async () => {
    try {
      setLoading(true);
      const data = await fetchInstitutePoliciesAdmin();

      // Format time values for input fields
      const formattedData = {
        ...data,
        working_hours_start: formatTimeForInput(data.working_hours_start),
        working_hours_end: formatTimeForInput(data.working_hours_end),
      };

      setPolicies(formattedData);
      setError(null);
    } catch (err) {
      console.error("Failed to reload institute policies", err);
      setError("Failed to reload policies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin mr-2">
          <RefreshCw size={24} />
        </div>
        <span>Loading policies...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold flex items-center">
          <Settings size={28} className="mr-3 text-purple-500" />
          Institute Policies
        </h1>
        <p className="text-gray-400 mt-2">
          Configure booking policies for the entire institute. These settings
          will be applied to all bookings across the platform.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-lg flex items-center">
          <AlertTriangle size={20} className="text-red-400 mr-2" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-700/30 rounded-lg flex items-center">
          <Check size={20} className="text-green-400 mr-2" />
          <span className="text-green-400">
            Institute policies updated successfully!
          </span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-medium mb-4 flex items-center">
            <CalendarDays size={20} className="mr-2 text-purple-400" />
            Booking Time Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Booking Opening Window (days)
              </label>
              <input
                type="number"
                name="booking_opening_days"
                value={policies.booking_opening_days}
                onChange={handleInputChange}
                min="1"
                max="365"
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                How many days in advance users can book rooms
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Booking Duration (hours)
              </label>
              <input
                type="number"
                name="max_booking_duration_hours"
                value={policies.max_booking_duration_hours}
                onChange={handleInputChange}
                min="1"
                max="24"
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum number of hours a room can be booked for
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-medium mb-4 flex items-center">
            <Clock size={20} className="mr-2 text-purple-400" />
            Working Hours
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Working Hours Start
              </label>
              <input
                type="time"
                name="working_hours_start"
                value={policies.working_hours_start}
                onChange={handleInputChange}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Time when rooms become available for booking (24-hour format)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Working Hours End
              </label>
              <input
                type="time"
                name="working_hours_end"
                value={policies.working_hours_end}
                onChange={handleInputChange}
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Time when rooms stop being available (24-hour format)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-medium mb-4 flex items-center">
            <CalendarClock size={20} className="mr-2 text-purple-400" />
            Approval Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="enable_auto_approval"
                  checked={policies.enable_auto_approval}
                  onChange={handleInputChange}
                  id="enable_auto_approval"
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 focus:ring-purple-600"
                />
                <label
                  htmlFor="enable_auto_approval"
                  className="ml-2 text-sm font-medium text-gray-300"
                >
                  Enable Auto Approval
                </label>
              </div>
              <p className="text-xs text-gray-400">
                If enabled, bookings will be automatically approved without
                admin intervention
              </p>
            </div>

            <div>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="allow_backdated_bookings"
                  checked={policies.allow_backdated_bookings}
                  onChange={handleInputChange}
                  id="allow_backdated_bookings"
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 focus:ring-purple-600"
                />
                <label
                  htmlFor="allow_backdated_bookings"
                  className="ml-2 text-sm font-medium text-gray-300"
                >
                  Allow Backdated Bookings
                </label>
              </div>
              <p className="text-xs text-gray-400">
                If enabled, users can book rooms for past dates (for
                record-keeping)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Approval Window (hours)
              </label>
              <input
                type="number"
                name="approval_window_hours"
                value={policies.approval_window_hours}
                onChange={handleInputChange}
                min="1"
                max="72"
                className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                How many hours admins have to approve or reject a booking
                request
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={handleReload}
            className="flex items-center py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading || saving}
          >
            <RefreshCw size={18} className="mr-2" />
            Reload
          </button>

          <button
            type="submit"
            className="flex-1 flex justify-center items-center py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InstitutePolicies;

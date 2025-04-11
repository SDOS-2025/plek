import React, { useState, useEffect } from "react";
import axios from "axios";
import NavBar from '../components/NavBar';

function Analytics() {
  const [activeTab, setActiveTab] = useState("totalBookings");
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let response;
        const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
        switch (activeTab) {
          case "totalBookings":
            response = await axios.get(`${BASE_URL}/api/analytics/bookings/?stat_type=totals`);
            break;
          case "peakHours":
            response = await axios.get(`${BASE_URL}/api/analytics/bookings/?stat_type=peak_hours`);
            break;
          case "topUsers":
            response = await axios.get(`${BASE_URL}/api/analytics/bookings/?stat_type=top_users`);
            break;
          case "mostBookedRooms":
            response = await axios.get(`${BASE_URL}/api/analytics/rooms/?stat_type=most_booked`);
            break;
          case "leastBookedRooms":
            response = await axios.get(`${BASE_URL}/api/analytics/rooms/?stat_type=least_booked`);
            break;
          case "utilization":
            response = await axios.get(`${BASE_URL}/api/analytics/rooms/?stat_type=utilization`);
            break;
          default:
            response = { data: [] };
        }
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [activeTab]);

  const renderContent = () => {
    if (data.length === 0) {
      return <p className='text-gray-400'>No data available for the selected tab.</p>;
    }
    return data.map((item, index) => (
      <div key={index} className="bg-plek-dark rounded-lg p-6">
        {Object.entries(item).map(([key, value]) => (
          <p key={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
          </p>
        ))}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-plek-background text-gray-100">
      {/* Navigation */}
      <NavBar activePage="analytics" />

      {/* Main Content */}
      <div className="min-w-[99vw] mx-auto px-4 py-10 flex-grow">
        <div className="bg-black p-6 rounded-lg mb-14">
          <div className="flex space-x-4 mb-6">
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "totalBookings"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("totalBookings")}
            >
              Total Bookings
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "peakHours"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("peakHours")}
            >
              Peak Hours
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "topUsers"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("topUsers")}
            >
              Top Users
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "mostBookedRooms"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("mostBookedRooms")}
            >
              Most Booked Rooms
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "leastBookedRooms"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("leastBookedRooms")}
            >
              Least Booked Rooms
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition-colors ${
                activeTab === "utilization"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              onClick={() => setActiveTab("utilization")}
            >
              Utilization
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto custom-scrollbar rounded-lg p-2 max-w-full w-full mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-plek-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <a href="/about" className="hover:text-white transition-colors">About us</a>
            <a href="/help" className="hover:text-white transition-colors">Help Center</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Analytics;
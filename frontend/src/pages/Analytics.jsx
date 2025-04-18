import React, { useState, useEffect } from "react";
import {
  BarChart3,
  PieChart,
  Clock,
  Users,
  Building,
  Calendar,
  BarChart,
  ActivitySquare,
} from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

function Analytics() {
  const [activeTab, setActiveTab] = useState("totalBookings");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;
        const BASE_URL =
          process.env.REACT_APP_API_URL || "http://localhost:8000";

        switch (activeTab) {
          case "totalBookings":
            // Simulated data - replace with API call
            response = {
              data: [
                { month: "January", count: 45 },
                { month: "February", count: 52 },
                { month: "March", count: 63 },
                { month: "April", count: 71 },
              ],
            };
            break;

          case "peakHours":
            // Simulated data - replace with API call
            response = {
              data: [
                { hour: "8:00 AM", count: 28 },
                { hour: "9:00 AM", count: 32 },
                { hour: "10:00 AM", count: 47 },
                { hour: "11:00 AM", count: 51 },
                { hour: "12:00 PM", count: 38 },
                { hour: "1:00 PM", count: 36 },
                { hour: "2:00 PM", count: 43 },
                { hour: "3:00 PM", count: 49 },
                { hour: "4:00 PM", count: 41 },
              ],
            };
            break;

          case "topUsers":
            // Simulated data - replace with API call
            response = {
              data: [
                { name: "John Smith", department: "Engineering", bookings: 15 },
                {
                  name: "Alice Johnson",
                  department: "Marketing",
                  bookings: 12,
                },
                { name: "David Chen", department: "Product", bookings: 10 },
                { name: "Sarah Williams", department: "HR", bookings: 8 },
                { name: "Michael Brown", department: "Sales", bookings: 7 },
              ],
            };
            break;

          case "mostBookedRooms":
            // Simulated data - replace with API call
            response = {
              data: [
                {
                  room: "B512",
                  building: "R&D Building",
                  bookings: 23,
                  capacity: 8,
                },
                {
                  room: "A204",
                  building: "Main Building",
                  bookings: 19,
                  capacity: 12,
                },
                {
                  room: "C101",
                  building: "Marketing Building",
                  bookings: 17,
                  capacity: 6,
                },
                {
                  room: "D305",
                  building: "Executive Building",
                  bookings: 14,
                  capacity: 16,
                },
              ],
            };
            break;

          case "leastBookedRooms":
            // Simulated data - replace with API call
            response = {
              data: [
                {
                  room: "E201",
                  building: "Annex Building",
                  bookings: 2,
                  capacity: 4,
                },
                {
                  room: "F102",
                  building: "Remote Office",
                  bookings: 3,
                  capacity: 8,
                },
                {
                  room: "G305",
                  building: "Research Building",
                  bookings: 5,
                  capacity: 10,
                },
                {
                  room: "H401",
                  building: "Training Center",
                  bookings: 6,
                  capacity: 20,
                },
              ],
            };
            break;

          case "utilization":
            // Simulated data - replace with API call
            response = {
              data: [
                {
                  room: "B512",
                  building: "R&D Building",
                  utilization: 85,
                  capacity: 8,
                },
                {
                  room: "A204",
                  building: "Main Building",
                  utilization: 72,
                  capacity: 12,
                },
                {
                  room: "C101",
                  building: "Marketing Building",
                  utilization: 64,
                  capacity: 6,
                },
                {
                  room: "D305",
                  building: "Executive Building",
                  utilization: 45,
                  capacity: 16,
                },
              ],
            };
            break;

          default:
            response = { data: [] };
        }

        setData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-plek-purple"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="bg-plek-dark rounded-lg p-8 text-center">
          <p className="text-gray-400">
            No data available for the selected category.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "totalBookings":
        return (
          <div className="space-y-6">
            <div className="section-card">
              <h3 className="card-header">Monthly Booking Trends</h3>
              <div className="h-64 p-4">
                {/* Chart would go here - Simplified representation */}
                <div className="h-full flex items-end justify-between">
                  {data.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center space-y-2 w-1/6"
                    >
                      <div
                        className="w-full bg-plek-purple rounded-t-md transition-all duration-500"
                        style={{
                          height: `${
                            (item.count /
                              Math.max(...data.map((d) => d.count))) *
                            100
                          }%`,
                        }}
                      ></div>
                      <div className="text-xs text-gray-400 truncate">
                        {item.month}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="bg-plek-lightgray/50 p-4 rounded-lg"
                  >
                    <h4 className="text-sm font-medium text-gray-300">
                      {item.month}
                    </h4>
                    <p className="text-xl font-bold mt-1">
                      {item.count}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        bookings
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "peakHours":
        return (
          <div className="space-y-6">
            <div className="section-card">
              <h3 className="card-header">Peak Booking Hours</h3>
              <div className="h-64 p-4">
                {/* Chart would go here - Simplified representation */}
                <div className="h-full flex items-end justify-between">
                  {data.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center space-y-2 w-1/12"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t-md transition-all duration-500"
                        style={{
                          height: `${
                            (item.count /
                              Math.max(...data.map((d) => d.count))) *
                            100
                          }%`,
                        }}
                      ></div>
                      <div className="text-xs text-gray-400 truncate rotate-45 origin-top-left mt-4 ml-4">
                        {item.hour}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-900/30 p-4 rounded-lg col-span-2 lg:col-span-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Most Popular Hour</h4>
                    <p className="text-xl font-bold">
                      {
                        data.reduce((prev, current) =>
                          prev.count > current.count ? prev : current
                        ).hour
                      }
                    </p>
                  </div>
                </div>
                {data.slice(0, 4).map((item, index) => (
                  <div
                    key={index}
                    className="bg-plek-lightgray/50 p-4 rounded-lg"
                  >
                    <h4 className="text-sm font-medium text-gray-300">
                      {item.hour}
                    </h4>
                    <p className="text-xl font-bold mt-1">
                      {item.count}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        bookings
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "topUsers":
        return (
          <div className="section-card">
            <h3 className="card-header">Top Users by Booking Count</h3>
            <div className="overflow-hidden rounded-lg">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-plek-lightgray/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Department
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                    >
                      Bookings
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-plek-lightgray/20 divide-y divide-gray-700">
                  {data.map((user, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-plek-background/50" : ""}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-plek-purple flex items-center justify-center text-white">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-white">
                              {user.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-900/30 text-green-400">
                            {user.bookings}
                          </span>
                          <div className="ml-2 h-2 bg-plek-dark rounded-full w-24">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  (user.bookings /
                                    Math.max(...data.map((u) => u.bookings))) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "mostBookedRooms":
      case "leastBookedRooms":
        const isLeast = activeTab === "leastBookedRooms";
        return (
          <div className="space-y-6">
            <div className="section-card">
              <h3 className="card-header">
                {isLeast ? "Least" : "Most"} Booked Rooms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((room, index) => (
                  <div
                    key={index}
                    className="bg-plek-lightgray/30 p-5 rounded-lg flex items-start gap-4"
                  >
                    <div
                      className={`flex-shrink-0 p-3 rounded-lg ${
                        isLeast ? "bg-yellow-900/30" : "bg-plek-purple/30"
                      }`}
                    >
                      <Building
                        size={24}
                        className={
                          isLeast ? "text-yellow-500" : "text-plek-purple"
                        }
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white">
                          Room {room.room}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded-full ${
                            isLeast
                              ? "bg-yellow-900/30 text-yellow-400"
                              : "bg-purple-900/30 text-purple-400"
                          }`}
                        >
                          {room.bookings} bookings
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        {room.building}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Capacity: {room.capacity}</span>
                        <span>
                          Avg. usage: {Math.round((room.bookings / 30) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "utilization":
        return (
          <div className="space-y-6">
            <div className="section-card">
              <h3 className="card-header">Room Utilization Rates</h3>
              <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-plek-lightgray/30 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Average Utilization Across All Rooms
                  </h4>
                  <div className="flex items-center">
                    <div className="relative w-full h-6 bg-plek-background rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-plek-purple rounded-full"
                        style={{
                          width: `${
                            data.reduce(
                              (acc, curr) => acc + curr.utilization,
                              0
                            ) / data.length
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="ml-3 text-xl font-bold">
                      {Math.round(
                        data.reduce((acc, curr) => acc + curr.utilization, 0) /
                          data.length
                      )}
                      %
                    </span>
                  </div>
                </div>
                <div className="bg-plek-lightgray/30 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Highest Utilized Room
                  </h4>
                  <div className="flex justify-between items-center">
                    <p className="text-white font-medium">
                      Room{" "}
                      {
                        data.reduce((prev, current) =>
                          prev.utilization > current.utilization
                            ? prev
                            : current
                        ).room
                      }
                    </p>
                    <span className="text-xl font-bold">
                      {Math.max(...data.map((room) => room.utilization))}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                {data.map((room, index) => (
                  <div
                    key={index}
                    className="bg-plek-lightgray/30 p-4 rounded-lg"
                  >
                    <div className="flex justify-between mb-2">
                      <div>
                        <h4 className="font-medium">Room {room.room}</h4>
                        <p className="text-xs text-gray-400">
                          {room.building} • Capacity: {room.capacity}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          room.utilization > 75
                            ? "bg-green-900/30 text-green-400"
                            : room.utilization > 50
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {room.utilization}%
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-plek-background rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full ${
                          room.utilization > 75
                            ? "bg-green-500"
                            : room.utilization > 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${room.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-gray-400">
            No visualization available for this data.
          </p>
        );
    }
  };

  return (
    <div className="page-container">
      {/* Navigation */}
      <NavBar activePage="analytics" />

      {/* Main Content */}
      <div className="main-content">
        <div className="section-card">
          {/* Analytics Navigation */}
          <div className="mb-6 border-b border-gray-800 pb-4">
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === "totalBookings"
                    ? "bg-plek-purple text-white"
                    : "bg-plek-lightgray text-gray-300 hover:bg-plek-hover"
                }`}
                onClick={() => setActiveTab("totalBookings")}
              >
                <BarChart className="h-4 w-4" />
                <span>Total Bookings</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === "peakHours"
                    ? "bg-plek-purple text-white"
                    : "bg-plek-lightgray text-gray-300 hover:bg-plek-hover"
                }`}
                onClick={() => setActiveTab("peakHours")}
              >
                <Clock className="h-4 w-4" />
                <span>Peak Hours</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === "topUsers"
                    ? "bg-plek-purple text-white"
                    : "bg-plek-lightgray text-gray-300 hover:bg-plek-hover"
                }`}
                onClick={() => setActiveTab("topUsers")}
              >
                <Users className="h-4 w-4" />
                <span>Top Users</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === "mostBookedRooms"
                    ? "bg-plek-purple text-white"
                    : "bg-plek-lightgray text-gray-300 hover:bg-plek-hover"
                }`}
                onClick={() => setActiveTab("mostBookedRooms")}
              >
                <Building className="h-4 w-4" />
                <span>Most Booked</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === "leastBookedRooms"
                    ? "bg-plek-purple text-white"
                    : "bg-plek-lightgray text-gray-300 hover:bg-plek-hover"
                }`}
                onClick={() => setActiveTab("leastBookedRooms")}
              >
                <Building className="h-4 w-4" />
                <span>Least Booked</span>
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === "utilization"
                    ? "bg-plek-purple text-white"
                    : "bg-plek-lightgray text-gray-300 hover:bg-plek-hover"
                }`}
                onClick={() => setActiveTab("utilization")}
              >
                <PieChart className="h-4 w-4" />
                <span>Utilization</span>
              </button>
            </div>
          </div>

          {/* Analytics Content */}
          <div>{renderTabContent()}</div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Analytics;

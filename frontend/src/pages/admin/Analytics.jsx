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
  AlertCircle,
} from "lucide-react";
import { CChart } from '@coreui/react-chartjs';
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import api from "../../api";

function Analytics() {
  const [activeTab, setActiveTab] = useState("totalBookings");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [coordinatorResources, setCoordinatorResources] = useState({
    buildings: [],
    floors: [],
    departments: [],
  });

  // Fetch user profile to determine role
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Fetch the user profile to get accurate role information
        const profileResponse = await api.get("/api/accounts/profile/");
        const userProfile = profileResponse.data;
        console.log("User profile:", userProfile);

        // Determine role from groups in the profile
        const groups = userProfile.groups || [];
        const groupNames = groups.map((group) =>
          typeof group === "string"
            ? group.toLowerCase()
            : group.name.toLowerCase()
        );

        if (userProfile.is_superuser || groupNames.includes("superadmin")) {
          setUserRole("superadmin");
          console.log("User role: superadmin");
        } else if (groupNames.includes("admin")) {
          setUserRole("admin");
          console.log("User role: admin");
        } else if (groupNames.includes("coordinator")) {
          setUserRole("coordinator");
          console.log("User role: coordinator");

          // For coordinators, fetch their assigned resources
          try {
            const coordResponse = await api.get("/bookings/floor-dept/");
            console.log(
              "Coordinator resources fetched:",
              coordResponse.data
            );

            // Extract managed resources from the response
            const managedBuildingsData =
              coordResponse.data.managed_buildings || [];
            const managedFloorsData = coordResponse.data.managed_floors || [];
            const managedDepartmentsData =
              coordResponse.data.managed_departments || [];

            // Set coordinator resources from API response
            setCoordinatorResources({
              buildings: managedBuildingsData,
              floors: managedFloorsData,
              departments: managedDepartmentsData,
            });
          } catch (coordError) {
            console.error("Error fetching coordinator data:", coordError);
          }
        } else {
          setUserRole("user");
          console.log("User role: regular user");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to a safe default
        setUserRole("user");
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;

        switch (activeTab) {
          case "totalBookings":
            response = await api.get("/api/analytics/bookings/?stat_type=totals");
            
            // Transform the data to group by month and year
            const bookingsByMonthYear = response.data.reduce((acc, item) => {
              const date = new Date(item.date);
              const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
              const monthName = date.toLocaleString('default', { month: 'long' });
              const yearMonth = `${monthName} ${date.getFullYear()}`;
              
              if (!acc[monthYear]) {
                acc[monthYear] = {
                  monthYear: monthYear,
                  displayName: yearMonth,
                  count: 0,
                  date: date
                };
              }
              
              acc[monthYear].count += item.total_bookings;
              return acc;
            }, {});
            
            // Convert to array and sort chronologically (oldest to newest)
            const sortedBookings = Object.values(bookingsByMonthYear)
              .sort((a, b) => a.date - b.date);
              
            // Log all months to verify what data we have
            console.log("Available months:", sortedBookings.map(item => item.displayName));
              
            setData(sortedBookings.map(item => ({
              month: item.displayName,
              count: item.count
            })));
            break;

          case "peakHours":
            response = await api.get("/api/analytics/bookings/?stat_type=peak_hours");
            setData(response.data.map(item => ({
              hour: `${item.label}`,
              count: item.value
            })));
            break;

          case "topUsers":
            response = await api.get("/api/analytics/bookings/?stat_type=top_users");
            console.log("Top Users API response:", response.data);
            
            // Check if the data is in the expected format
            if (Array.isArray(response.data) && response.data.length > 0) {
              setData(response.data.map(item => ({
                name: item.label || "Unknown User",
                department: "N/A", // The API doesn't provide department info
                bookings: item.value || 0
              })));
              console.log("Transformed top users data:", data);
            } else {
              console.error("Unexpected data format for top users:", response.data);
              setError("Received unexpected data format from the server");
              setData([]);
            }
            break;

          case "mostBookedRooms":
            response = await api.get("/api/analytics/rooms/?stat_type=most_booked");
            setData(response.data.map(item => ({
              room: item.name,
              building: item.building,
              bookings: item.count,
              // Extract capacity from amenities if it exists in that format
              capacity: item.amenities && Array.isArray(item.amenities) 
                ? item.amenities.find(a => a.startsWith("Capacity:"))
                  ? parseInt(item.amenities.find(a => a.startsWith("Capacity:")).split("Capacity:")[1].trim())
                  : 0
                : 0
            })));
            break;

          case "leastBookedRooms":
            response = await api.get("/api/analytics/rooms/?stat_type=least_booked");
            setData(response.data.map(item => ({
              room: item.name,
              building: item.building,
              bookings: item.count,
              // Extract capacity from amenities if it exists in that format
              capacity: item.amenities && Array.isArray(item.amenities) 
                ? item.amenities.find(a => a.startsWith("Capacity:"))
                  ? parseInt(item.amenities.find(a => a.startsWith("Capacity:")).split("Capacity:")[1].trim())
                  : 0
                : 0
            })));
            break;

          case "utilization":
            response = await api.get("/api/analytics/rooms/?stat_type=utilization");
            setData(response.data.map(item => ({
              room: item.name,
              building: item.building_name || item.building,
              utilization: Math.round(item.usage_hours || 0),
              capacity: item.capacity || 0,
              totalAttendees: item.total_attendees || 0,
              bookingCount: item.booking_count || 0,
              avgAttendees: item.avg_attendees || 0,
              attendeeRatio: Math.round(((item.avg_attendees || 0) / (item.capacity || 1)) * 100)
            })));
            break;

          default:
            setData([]);
        }
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
              
              {/* Chart visualization */}
              <div className="mt-6 mb-8 bg-plek-lightgray/30 p-4 rounded-lg">
                <CChart
                  type="bar"
                  data={{
                    labels: data.map(item => item.month),
                    datasets: [
                      {
                        label: 'Total Bookings',
                        backgroundColor: 'rgba(129, 74, 198, 0.8)',
                        data: data.map(item => item.count),
                        borderRadius: 4,
                      }
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: {
                        labels: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            family: 'Inter, sans-serif',
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            family: 'Inter, sans-serif',
                          }
                        }
                      },
                      y: {
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            family: 'Inter, sans-serif',
                          }
                        }
                      }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  style={{ height: '300px' }}
                />
              </div>
              
              {/* Data grid (unchanged) */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              
              {/* Chart visualization */}
              <div className="mt-6 mb-8 bg-plek-lightgray/30 p-4 rounded-lg">
                <CChart
                  type="bar"
                  data={{
                    labels: data.map(item => item.hour),
                    datasets: [
                      {
                        label: 'Bookings Count',
                        backgroundColor: 'rgba(66, 133, 244, 0.8)',
                        data: data.map(item => item.count),
                        borderRadius: 4,
                      }
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: {
                        labels: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            family: 'Inter, sans-serif',
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            family: 'Inter, sans-serif',
                          }
                        }
                      },
                      y: {
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.8)',
                          font: {
                            family: 'Inter, sans-serif',
                          }
                        }
                      }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  style={{ height: '300px' }}
                />
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
                <div className="col-span-2 lg:col-span-4 overflow-x-auto">
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 min-w-full">
                    {data.map((item, index) => (
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
                  {data.map((user, index) => {
                    // Handle email addresses for initials with null check
                    let initials = "";
                    const userName = user.name || "Unknown";  // Default to "Unknown" if name is undefined
                    
                    if (userName.includes("@")) {
                      // It's an email address, use the first letter of the local part
                      initials = userName.split("@")[0][0].toUpperCase();
                    } else {
                      // It's a regular name, use initials as before
                      initials = userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("");
                    }
                    
                    return (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-plek-background/50" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-plek-purple flex items-center justify-center text-white">
                              {initials || "?"}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-white">
                                {userName}
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
                    );
                  })}
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
                      className={`flex-shrink-0 p-3 rounded-lg bg-plek-purple/30`}
                    >
                      <Building
                        size={24}
                        className="text-plek-purple"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white">
                          Room {room.room}
                        </h4>
                        <span
                          className="px-2 py-1 text-xs font-bold rounded-full bg-purple-900/30 text-purple-400"
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
              <h3 className="card-header">Room Utilization and Attendance</h3>
              <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-plek-lightgray/30 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Average Utilization Across All Rooms
                  </h4>
                  <div className="flex items-center">
                    <div className="relative w-full h-6 bg-plek-background rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-plek-purple rounded-full"
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
                    Average Space Utilization (Attendees/Capacity)
                  </h4>
                  <div className="flex items-center">
                    <div className="relative w-full h-6 bg-plek-background rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-plek-purple rounded-full"
                        style={{
                          width: `${Math.min(100, 
                            data.reduce((acc, curr) => acc + curr.attendeeRatio, 0) /
                              data.length
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="ml-3 text-xl font-bold">
                      {Math.round(
                        data.reduce((acc, curr) => acc + curr.attendeeRatio, 0) /
                          data.length
                      )}
                      %
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
                      <div className="flex flex-col items-end">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            room.utilization > 75
                              ? "bg-green-900/30 text-green-400"
                              : room.utilization > 50
                              ? "bg-yellow-900/30 text-yellow-400"
                              : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {room.utilization}% time used
                        </span>
                        <span
                          className={`mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                            room.attendeeRatio > 75
                              ? "bg-blue-900/30 text-blue-400"
                              : room.attendeeRatio > 50
                              ? "bg-indigo-900/30 text-indigo-400"
                              : "bg-purple-900/30 text-purple-400"
                          }`}
                        >
                          {room.attendeeRatio}% space filled
                        </span>
                      </div>
                    </div>
                    
                    {/* Time utilization bar */}
                    <div className="relative w-full h-2 bg-plek-background rounded-full overflow-hidden mb-2">
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
                    
                    {/* Attendees/Capacity bar */}
                    <div className="relative w-full h-2 bg-plek-background rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full ${
                          room.attendeeRatio > 75
                            ? "bg-blue-500"
                            : room.attendeeRatio > 50
                            ? "bg-indigo-500"
                            : "bg-purple-500"
                        }`}
                        style={{ width: `${room.attendeeRatio}%` }}
                      ></div>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-400 flex justify-between">
                      <span>Avg attendees: {room.avgAttendees} people</span>
                      <span>Total bookings: {room.bookingCount}</span>
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
        {/* Coordinator info banner */}
        {userRole === "coordinator" && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex items-start text-blue-200">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Coordinator View</p>
                <p className="text-sm">
                  You're viewing analytics for your assigned rooms only.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                  <div>
                    <span className="font-medium">Managed Buildings:</span>{" "}
                    {coordinatorResources.buildings &&
                    coordinatorResources.buildings.length > 0
                      ? coordinatorResources.buildings
                          .filter(
                            (b) => b && (typeof b === "object" ? b.name : b)
                          )
                          .map((b) => {
                            if (typeof b === "object") {
                              return b.name || `Building ${b.id}`;
                            } else if (typeof b === "number") {
                              // If it's just a number ID, try to find the corresponding building object
                              const buildingObj = coordinatorResources.floors
                                .filter(
                                  (f) =>
                                    f &&
                                    typeof f === "object" &&
                                    f.building_id === b
                                )
                                .map((f) => f.building_name)[0];
                              return buildingObj || `Building ${b}`;
                            }
                            return String(b);
                          })
                          .filter(Boolean) // Remove any undefined/null values
                          .join(", ")
                      : "None"}
                  </div>
                  <div>
                    <span className="font-medium">Managed Floors:</span>{" "}
                    {coordinatorResources.floors &&
                    coordinatorResources.floors.length > 0
                      ? [
                          ...new Set(
                            coordinatorResources.floors
                              .filter(
                                (f) =>
                                  f &&
                                  (typeof f === "object"
                                    ? f.id || f.number || f.name
                                    : f)
                              )
                              .map((f) => {
                                if (typeof f === "object") {
                                  // Format floor as "Floor X" or use the floor name if available
                                  const floorName = f.name
                                    ? f.name
                                    : `Floor ${f.number}`;
                                  return floorName;
                                }
                                return f;
                              })
                          ),
                        ]
                          .sort()
                          .join(", ")
                      : "None"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Managed Departments:</span>{" "}
                    {coordinatorResources.departments &&
                    coordinatorResources.departments.length > 0
                      ? coordinatorResources.departments
                          .filter((d) => d && typeof d === "object")
                          .map((d) => {
                            if (typeof d === "object") {
                              // Return department name with code if available
                              return (
                                d.name ||
                                (d.code
                                  ? `${d.code} Department`
                                  : `Department ${d.id}`)
                              );
                            }
                            return `Department ${d}`; // Fallback for non-object values
                          })
                          .join(", ")
                      : "None"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

import React from 'react';
import {Calendar, Clock, Users, Activity, BookMarked } from 'lucide-react';
import { Link} from 'react-router-dom';


function Dashboard() {
  const Username = localStorage.getItem('Username');

  return (
    <div className="flex flex-col min-h-screen bg-plek-background text-gray-100">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4 bg-plek-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <span className="ml-2 text-xl font-semibold">Plek</span>
            </div>
            <div className="flex space-x-6">
              <a href="Dashboard" className="text-purple-400 hover:text-purple-300">Dashboard</a>
              <a href="Booking" className="text-gray-400 hover:text-gray-300">Book a room</a>
              <a href="#" className="text-gray-400 hover:text-gray-300">My Bookings</a>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center">
                <span className="text-sm font-medium"></span>
              </div>
              <span className="ml-2">{Username}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="bg-plek-dark rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-700/50 p-4 rounded-md">
                <p className="text-sm text-gray-300">You booked Room 102 for Feb 7, 3:00 PM</p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-md">
                <p className="text-sm text-gray-300">Your booking request was approved by the coordinator</p>
              </div>
              <div className="bg-gray-700/50 p-4 rounded-md">
                <p className="text-sm text-gray-300">Admin modified your room reservation</p>
              </div>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="lg:col-span-2">
            <div className="bg-plek-dark rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                Upcoming Bookings
              </h2>
              <div className="space-y-4">
                {[
                  {
                    room: 'B512',
                    building: 'Research and Development Building',
                    slot: '4 - 5 pm',
                    date: '6th February 2025',
                    capacity: 8
                  },
                  {
                    room: 'B512',
                    building: 'Research and Development Building',
                    slot: '2 - 3 pm',
                    date: '7th February 2025',
                    capacity: 8
                  }
                ].map((booking, index) => (
                  <div key={index} className="bg-gray-700/50 p-6 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">Room: {booking.room}</h3>
                        <p className="text-gray-400 mt-1">{booking.building}</p>
                        <div className="mt-3 flex items-center space-x-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-300">{booking.slot}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-300">{booking.date}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-300">Capacity: {booking.capacity}</span>
                          </div>
                        </div>
                      </div>
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">
                        Modify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Favourite Rooms */}
            <div className="bg-plek-dark rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BookMarked className="h-5 w-5 mr-2 text-purple-500" />
                Favourite Rooms
              </h2>
              <div className="space-y-4">
                {[
                  {
                    room: 'B512',
                    building: 'Research and Development Building',
                    capacity: 8
                  },
                  {
                    room: 'A204',
                    building: 'Research and Development Building',
                    capacity: 8
                  }
                ].map((room, index) => (
                  <div key={index} className="bg-gray-700/50 p-6 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">Room: {room.room}</h3>
                        <p className="text-gray-400 mt-1">{room.building}</p>
                        <div className="mt-3 flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-300">Capacity: {room.capacity}</span>
                        </div>
                      </div>
                      <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 bg-plek-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link to="/about" className="hover:text-white transition-colors">About us</Link>
            <Link to="/help" className="hover:text-white transition-colors">Help Center</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
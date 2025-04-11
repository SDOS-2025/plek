import React, { useState } from "react";
import { X, Building2, Calendar, Clock, Users, Projector, Wifi, Square } from "lucide-react";

const BookingModal = ({ room, onClose }) => {
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle booking submission here
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Confirm Booking</h2>
          <p className="text-gray-400">
            Please review and confirm your room booking details
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-gray-300">
              <Building2 size={20} />
              <div>
                <p className="text-sm text-gray-400">Room</p>
                <p>
                  {room.name} - {room.building}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Calendar size={20} />
              <div>
                <p className="text-sm text-gray-400">Date</p>
                <p>{room.date}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-gray-300">
              <Clock size={20} />
              <div>
                <p className="text-sm text-gray-400">Time Slot</p>
                <p>{room.timeSlot}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Users size={20} />
              <div>
                <p className="text-sm text-gray-400">Capacity</p>
                <p>{room.capacity} people</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Available Amenities</h3>
          <div className="flex space-x-4">
            {room.amenities.includes("projector") && (
              <div className="flex items-center space-x-2 text-gray-300">
                <Projector size={18} />
                <span>Projector</span>
              </div>
            )}
            {room.amenities.includes("wifi") && (
              <div className="flex items-center space-x-2 text-gray-300">
                <Wifi size={18} />
                <span>Wi-Fi</span>
              </div>
            )}
            {room.amenities.includes("whiteboard") && (
              <div className="flex items-center space-x-2 text-gray-300">
                <Square size={18} />
                <span>Whiteboard</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purpose of Booking
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g., Team Meeting, Workshop, Training"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Attendees
            </label>
            <input
              type="number"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              max={room.capacity}
              className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter number of attendees"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 h-32"
              placeholder="Any special requirements or notes"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Request Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
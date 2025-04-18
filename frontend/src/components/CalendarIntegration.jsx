import React, { useState, useEffect } from 'react';
import { 
  listUserCalendars, 
  getBookingCalendarEvent, 
  addBookingToCalendar, 
  updateCalendarEvent, 
  removeBookingFromCalendar 
} from '../api';

const CalendarIntegration = ({ bookingId, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [calendarEvent, setCalendarEvent] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Load user's Google Calendars and check if booking is already synced
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch available calendars
        const calendarsData = await listUserCalendars();
        setCalendars(calendarsData);
        
        // Check if booking is already synced
        const eventData = await getBookingCalendarEvent(bookingId);
        if (eventData.has_calendar_event) {
          setCalendarEvent(eventData);
          setSelectedCalendar(eventData.calendar_id);
        }
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError('Failed to load calendars. Make sure you have connected your Google account.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [bookingId]);

  const handleAddToCalendar = async () => {
    if (!selectedCalendar) {
      setError('Please select a calendar');
      return;
    }
    
    try {
      setSyncing(true);
      setError('');
      const result = await addBookingToCalendar(bookingId, selectedCalendar);
      setCalendarEvent(result);
      if (onSuccess) onSuccess('added');
    } catch (err) {
      console.error('Error adding to calendar:', err);
      setError('Failed to add booking to your calendar');
    } finally {
      setSyncing(false);
    }
  };
  
  const handleUpdateCalendarEvent = async () => {
    try {
      setSyncing(true);
      setError('');
      const result = await updateCalendarEvent(bookingId);
      setCalendarEvent(result);
      if (onSuccess) onSuccess('updated');
    } catch (err) {
      console.error('Error updating calendar event:', err);
      setError('Failed to update calendar event');
    } finally {
      setSyncing(false);
    }
  };
  
  const handleRemoveFromCalendar = async () => {
    try {
      setSyncing(true);
      setError('');
      await removeBookingFromCalendar(bookingId);
      setCalendarEvent(null);
      if (onSuccess) onSuccess('removed');
    } catch (err) {
      console.error('Error removing from calendar:', err);
      setError('Failed to remove booking from calendar');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading calendar data...</div>;
  }

  // If calendars couldn't be loaded
  if (calendars.length === 0 && !error) {
    return (
      <div className="rounded-lg border p-4 shadow-sm bg-yellow-50">
        <h3 className="font-medium mb-2">Google Calendar Integration</h3>
        <p className="text-sm text-gray-600 mb-3">
          No calendars found. Make sure you've connected your Google account with calendar permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h3 className="font-medium mb-2">Google Calendar Integration</h3>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-3">
          {error}
        </div>
      )}
      
      {calendarEvent ? (
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">
            This booking is synced to your Google Calendar
          </p>
          {calendarEvent.html_link && (
            <a 
              href={calendarEvent.html_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm block mb-3"
            >
              View in Google Calendar
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleUpdateCalendarEvent}
              disabled={syncing}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Updating...' : 'Update Event'}
            </button>
            <button
              onClick={handleRemoveFromCalendar}
              disabled={syncing}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              {syncing ? 'Removing...' : 'Remove from Calendar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">
            Add this booking to your Google Calendar
          </p>
          <select
            value={selectedCalendar}
            onChange={(e) => setSelectedCalendar(e.target.value)}
            className="w-full p-2 border rounded mb-3 text-sm"
            disabled={syncing}
          >
            <option value="">Select a calendar</option>
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary} {calendar.primary ? '(Primary)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddToCalendar}
            disabled={!selectedCalendar || syncing}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            {syncing ? 'Adding...' : 'Add to Calendar'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarIntegration;
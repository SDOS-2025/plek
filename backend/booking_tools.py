import requests
import json
import datetime
from typing import Dict, Any, Optional, List, Union
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bookings.models import Booking
from django.utils import timezone

class BookingTools:
    def __init__(self, base_url: str = "http://127.0.0.1:8000", session: Optional[Any] = None):
        self.base_url = base_url
        self.session = session or requests.Session()
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG)
        
        # Configure retries
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST", "PATCH", "DELETE", "GET"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
    
    def _log_request(self, method: str, url: str, payload: dict):
        """Log API request details"""
        self.logger.debug(f"API Request: {method} {url}")
        self.logger.debug(f"Request Payload: {json.dumps(payload, indent=2)}")

    def _log_response(self, response):
        """Log API response details"""
        self.logger.debug(f"API Response: {response.status_code}")
        self.logger.debug(f"Response Headers: {dict(response.headers)}")
        self.logger.debug(f"Response Body: {response.text[:500]}")  # Limit log size
    
    def book_room(self, 
                  room_id: Union[int, str], 
                  date: str, 
                  start_time: str, 
                  end_time: str, 
                  purpose: str = "Meeting", 
                  participants: str = None) -> Dict[str, Any]:
        """
        Book a room using the Django API
        
        Args:
            room_id: ID or name of room
            date: Date in YYYY-MM-DD format
            start_time: Start time in HH:MM format
            end_time: End time in HH:MM format
            purpose: Purpose of booking
            participants: List of participants
            
        Returns:
            Response from API with success/error message
        """
        print("Book_Room booking tool is being executed")
        self.logger.debug(f"Attempting to book room {room_id} from {start_time} to {end_time}")
        print(f"🔄 Booking room: {room_id} on {date} from {start_time} to {end_time}")
        
        try:
            # If room_id is not a number, we need to find the room by name
            if not str(room_id).isdigit():
                room_id = self._find_room_by_name(room_id)
                if not room_id:
                    return {"success": False, "error": f"Room not found: {room_id}"}
            
            # Parse date and time strings to create ISO format
            start_datetime = self._combine_date_time(date, start_time)
            end_datetime = self._combine_date_time(date, end_time)
            
            # Prepare the payload
            payload = {
                "room": room_id,
                "start_time": start_datetime,
                "end_time": end_datetime,
                "purpose": purpose,
                "participants": participants if participants else "null"
            }
            
            print("The data used to create a booking request is:")
            print(payload)
            print("Sending POST api request")
            
            # Get CSRF token from session
            csrf_token = self.session.cookies.get('csrftoken')
            if not csrf_token:
                return {"success": False, "error": "CSRF token not found in session"}
            
            # Make API call with CSRF token in headers
            headers = {
                "Content-Type": "application/json",
                "X-CSRFToken": csrf_token
            }
            
            self._log_request("POST", f"{self.base_url}/bookings/create/", payload)
            response = self.session.post(
                f"{self.base_url}/bookings/create/",
                json=payload,
                headers=headers
            )
            self._log_response(response)
            
            print("The response received from the api post request is")
            print(response.status_code)
            print(response.text)
            
            if response.status_code == 201:
                print("Response status code 201")
                booking_data = response.json()
                booking_id = booking_data.get('id')
                
                # Database verification
                db_check = self._verify_booking_in_db(booking_id, {
                    'room_id': room_id,
                    'start_time': booking_data['start_time'],
                    'end_time': booking_data['end_time'],
                    'purpose': purpose
                })
                
                print("Database verification")
                print(db_check)
                
                result = {
                    "success": True,
                    "message": f"Room booked successfully! Booking ID: {booking_id}",
                    "booking_id": booking_id,
                    "data": booking_data,
                    "db_verification": db_check
                }
                
                print(result)
                return result
            else:
                error_data = response.json() if response.text else {"detail": "Unknown error"}
                print("Error in room booking")
                print(error_data)
                result_error = {
                    "success": False,
                    "status_code": response.status_code,
                    "error": error_data
                }
                print(result_error)
                return result_error
                
        except Exception as e:
            print(f"❌ Error booking room: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _ensure_csrf_token(self) -> str:
        """Ensure we have a valid CSRF token"""
        csrf_token = self.session.cookies.get('csrftoken')
        if not csrf_token:
            # Get a new CSRF token
            response = self.session.get(f"{self.base_url}/api/auth/csrf/")
            csrf_token = self.session.cookies.get('csrftoken')
            if not csrf_token:
                raise ValueError("Could not obtain CSRF token")
        return csrf_token
    
    def cancel_booking(self, booking_id: int) -> Dict[str, Any]:
        """Cancel a booking using the Django API"""
        self.logger.debug(f"Attempting to cancel booking {booking_id}")
        print(f"🔄 Cancelling booking ID: {booking_id}")
        
        try:
            # Ensure we have a valid CSRF token
            csrf_token = self._ensure_csrf_token()
            
            # Include all necessary headers for authentication
            headers = {
                "X-CSRFToken": csrf_token,
                "Cookie": f"csrftoken={csrf_token}; sessionid={self.session.cookies.get('sessionid')}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Referer": self.base_url  # Add referer header
            }
            
            self._log_request("DELETE", f"{self.base_url}/bookings/{booking_id}/", {})
            
            # Log headers for debugging
            self.logger.debug(f"Request Headers: {headers}")
            
            # Make the DELETE request
            response = self.session.delete(
                f"{self.base_url}/bookings/{booking_id}/",
                headers=headers
            )
            
            # Log the response
            self._log_response(response)
            
            if response.status_code in [200, 204]:
                # Rest of success handling...
                return {
                    "success": True,
                    "message": f"Booking {booking_id} cancelled successfully!"
                }
            else:
                error_data = response.json() if response.text else {"detail": "Unknown error"}
                self.logger.error(f"Failed to cancel booking: {error_data}")
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": error_data
                }
                
        except Exception as e:
            self.logger.error(f"❌ Error cancelling booking: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def modify_booking(self, booking_id: int, **kwargs) -> Dict[str, Any]:
        """
        Modify a booking using the Django API
        
        Args:
            booking_id: ID of booking to modify
            **kwargs: Fields to update (start_time, end_time, purpose, participants)
            
        Returns:
            Response from API with success/error message
        """
        self.logger.debug(f"Modifying booking {booking_id} with data: {kwargs}")
        print(f"🔄 Modifying booking ID: {booking_id} with {kwargs}")
        
        try:
            # Process date and time if provided
            if 'date' in kwargs and 'start_time' in kwargs:
                kwargs['start_time'] = self._combine_date_time(kwargs['date'], kwargs['start_time'])
                del kwargs['date']
                
            if 'date' in kwargs and 'end_time' in kwargs:
                kwargs['end_time'] = self._combine_date_time(kwargs['date'], kwargs['end_time'])
                if 'date' in kwargs:
                    del kwargs['date']
            
            # Make API call
            self._log_request("PATCH", f"{self.base_url}/bookings/{booking_id}/", kwargs)
            response = self.session.patch(
                f"{self.base_url}/bookings/{booking_id}/",
                json=kwargs
            )
            self._log_response(response)
            
            if response.status_code == 200:
                booking_data = response.json()
                # Database verification
                db_check = self._verify_booking_in_db(booking_id, {
                    'start_time': booking_data.get('start_time'),
                    'end_time': booking_data.get('end_time'),
                    'purpose': booking_data.get('purpose'),
                    **kwargs
                })
                
                return {
                    "success": True,
                    "message": f"Booking {booking_id} updated successfully!",
                    "data": booking_data,
                    "db_verification": db_check
                }
            else:
                error_data = response.json() if response.text else {"detail": "Unknown error"}
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": error_data
                }
                
        except Exception as e:
            print(f"❌ Error modifying booking: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def list_my_bookings(self) -> Dict[str, Any]:
        """List the user's bookings"""
        print(f"🔄 Retrieving user's bookings")
        
        try:
            response = self.session.get(
                f"{self.base_url}/bookings/"
            )
            
            self._log_response(response)
            
            if response.status_code == 200:
                all_bookings = response.json()
                # Filter bookings by status
                active_bookings = [
                    booking for booking in all_bookings 
                    if booking.get('status') in ['PENDING', 'APPROVED']
                ]
                return {
                    "success": True,
                    "bookings": active_bookings
                }
            else:
                error_data = response.json() if response.text else {"detail": "Unknown error"}
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": error_data
                }
                
        except Exception as e:
            print(f"❌ Error listing bookings: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _find_room_by_name(self, room_name: str) -> Optional[int]:
        """
        Find a room ID by name
        
        Args:
            room_name: Name of the room
            
        Returns:
            Room ID if found, None otherwise
        """
        try:
            # If room_name is a number (like "101"), try to find by number first
            if room_name.isdigit():
                response = self.session.get(f"{self.base_url}/rooms/")
                if response.status_code == 200:
                    rooms = response.json()
                    for room in rooms:
                        if room.get('number') == room_name or room.get('name') == f"Room {room_name}":
                            return room.get('id')
            
            # Try to find by name 
            response = self.session.get(f"{self.base_url}/rooms/")
            if response.status_code == 200:
                rooms = response.json()
                for room in rooms:
                    if room.get('name').lower() == room_name.lower():
                        return room.get('id')
            
            return None
        except Exception as e:
            print(f"❌ Error finding room: {str(e)}")
            return None
    
    def _combine_date_time(self, date_str: str, time_str: str) -> str:
        """
        Combine date and time strings into ISO format in UTC
        
        Args:
            date_str: Date in YYYY-MM-DD format or relative date (e.g., "today", "tomorrow")
            time_str: Time in HH:MM format
            
        Returns:
            ISO formatted datetime string in UTC
        """
        # Handle relative dates
        today = datetime.date.today()
        if date_str.lower() == "today":
            date_obj = today
        elif date_str.lower() == "tomorrow":
            date_obj = today + datetime.timedelta(days=1)
        elif date_str.lower() == "day after tomorrow":
            date_obj = today + datetime.timedelta(days=2)
        elif date_str.lower().startswith("next "):
            # Handle "next Sunday", "next Monday", etc.
            weekday = date_str.lower().split(" ")[1]
            weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            if weekday in weekdays:
                days_ahead = (weekdays.index(weekday) - today.weekday()) % 7
                if days_ahead <= 0:  # If the day is today or in the past, add 7 days
                    days_ahead += 7
                date_obj = today + datetime.timedelta(days=days_ahead)
            else:
                date_obj = today  # Default to today if weekday is invalid
        else:
            # Assume it's a YYYY-MM-DD format
            try:
                date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                date_obj = today  # Default to today if date format is invalid
        
        date_str = date_obj.strftime("%Y-%m-%d")
        
        # Handle 12-hour format (e.g. "2 PM")
        if "am" in time_str.lower() or "pm" in time_str.lower():
            # Convert to 24-hour format
            time_obj = datetime.datetime.strptime(time_str, "%I %p").time()
            time_str = time_obj.strftime("%H:%M")
        
        # Combine date and time in local timezone
        local_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))  # IST timezone
        local_datetime = datetime.datetime.strptime(f"{date_str}T{time_str}", "%Y-%m-%dT%H:%M")
        local_datetime = local_datetime.replace(tzinfo=local_tz)
        
        # Convert to UTC
        utc_datetime = local_datetime.astimezone(datetime.timezone.utc)
        
        return utc_datetime.isoformat()

    def _verify_booking_in_db(self, booking_id: int, expected_data: dict) -> dict:
        """Verify booking details in the database"""
        try:
            booking = Booking.objects.get(id=booking_id)
            self.logger.debug(f"✅ Found booking {booking_id} in database")
            
            verification = {
                "exists": True,
                "room_matches": str(booking.room.id) == str(expected_data.get('room_id')),
                "time_matches": (
                    booking.start_time.isoformat() == expected_data.get('start_time') and
                    booking.end_time.isoformat() == expected_data.get('end_time')
                ),
                "purpose_matches": booking.purpose == expected_data.get('purpose'),
                "status_matches": booking.status == expected_data.get('status', 'PENDING')
            }
            
            self.logger.debug(f"🔍 Booking verification results:")
            self.logger.debug(f" - Room matches: {verification['room_matches']}")
            self.logger.debug(f" - Time matches: {verification['time_matches']}")
            self.logger.debug(f" - Purpose matches: {verification['purpose_matches']}")
            self.logger.debug(f" - Status matches: {verification['status_matches']}")
            
            return verification
            
        except Booking.DoesNotExist:
            self.logger.error(f"❌ Booking {booking_id} not found in database")
            return {"exists": False}
        except Exception as e:
            self.logger.error(f"❌ Database verification error: {str(e)}")
            return {"error": str(e)}

    def generate_response(self, user_message: str, booking_info: Optional[Dict[str, Any]] = None) -> str:
        # Add debug info to the context
        debug_info = {
            "received_at": timezone.now().isoformat(),
            "booking_verified": booking_info.get('db_verification', {}).get('exists', False) 
                              if booking_info else False
        }
        
        if booking_info:
            booking_info['debug'] = debug_info
        
    def find_bookings(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find bookings matching the given search parameters"""
        try:
            # Convert time formats if needed
            if 'time_range' in search_params:
                time_range = search_params['time_range']
                
                # Convert start time from 12-hour to 24-hour format if needed
                if time_range.get('start'):
                    try:
                        if 'am' in time_range['start'].lower() or 'pm' in time_range['start'].lower():
                            time_obj = datetime.datetime.strptime(time_range['start'], "%I %p").time()
                            time_range['start'] = time_obj.strftime("%H:%M")
                    except ValueError as e:
                        print(f"Error converting start time: {e}")
                        return []
                
                # Convert end time from 12-hour to 24-hour format if needed
                if time_range.get('end'):
                    try:
                        if 'am' in time_range['end'].lower() or 'pm' in time_range['end'].lower():
                            time_obj = datetime.datetime.strptime(time_range['end'], "%I %p").time()
                            time_range['end'] = time_obj.strftime("%H:%M")
                    except ValueError as e:
                        print(f"Error converting end time: {e}")
                        return []
                
                search_params['time_range'] = time_range

            # Rest of the existing find_bookings code
            query_params = {}
            
            if 'room_id' in search_params:
                query_params['room'] = search_params['room_id']
                
            if 'date' in search_params:
                query_params['date'] = search_params['date']
            
            # Make API call
            response = self.session.get(
                f"{self.base_url}/bookings/",
                params=query_params
            )
            
            if response.status_code != 200:
                return []
                
            # Parse the response as JSON
            try:
                all_bookings = response.json()
            except json.JSONDecodeError:
                return []
            
            # Filter bookings by date if provided
            if 'date' in search_params:
                target_date = search_params['date']
                filtered_bookings = []
                
                for booking in all_bookings:
                    booking_start = booking.get('start_time', '')
                    # Extract date from booking's start_time
                    if booking_start:
                        try:
                            booking_date = datetime.datetime.fromisoformat(booking_start).date().isoformat()
                            if booking_date == target_date:
                                filtered_bookings.append(booking)
                        except ValueError:
                            continue
                all_bookings = filtered_bookings
            
            # Filter results based on time range if provided
            if 'time_range' in search_params:
                time_range = search_params['time_range']
                filtered_bookings = []
                
                for booking in all_bookings:
                    booking_start = booking.get('start_time')
                    booking_end = booking.get('end_time')
                    
                    # Skip if no time information
                    if not booking_start or not booking_end:
                        continue
                        
                    # Match start time if provided
                    if time_range.get('start') and not self._times_overlap(
                        time_range['start'], None, booking_start, booking_end
                    ):
                        continue
                    
                    # Match end time if provided
                    if time_range.get('end') and not self._times_overlap(
                        None, time_range['end'], booking_start, booking_end
                    ):
                        continue
                        
                    filtered_bookings.append(booking)
                    
                return filtered_bookings
            
            return all_bookings
            
        except Exception as e:
            print(f"❌ Error finding bookings: {str(e)}")
            return []

    def _times_overlap(self, start1: Optional[str], end1: Optional[str], 
                      start2: str, end2: str) -> bool:
        """
        Check if two time ranges overlap
        """
        # Convert times to datetime objects for comparison
        def to_time(t: str) -> datetime.time:
            return datetime.datetime.strptime(t, "%H:%M").time()
        
        # Convert all times
        start2_time = to_time(start2.split('T')[1][:5])
        end2_time = to_time(end2.split('T')[1][:5])
        
        if start1:
            start1_time = to_time(start1)
            if start1_time > end2_time:
                return False
                
        if end1:
            end1_time = to_time(end1)
            if end1_time < start2_time:
                return False
                
        return True

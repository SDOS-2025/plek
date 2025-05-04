import os
import django
import datetime

# Configure Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

import sys
import getpass
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from llm_utils import LLMManager
from booking_tools import BookingTools

# Load environment variables
load_dotenv()

class BookingAgent:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
        self.session = requests.Session()
        self.llm_manager = LLMManager()
        self.booking_tools = None
        self.initialize_session()

    def initialize_session(self):
        """Initialize authentication and session"""
        self._get_csrf_token()
        self._authenticate_user()
        self.booking_tools = BookingTools(base_url=self.base_url, session=self.session)

    def _get_csrf_token(self):
        """Fetch CSRF token from Django server"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/csrf/")
            if response.status_code == 200:
                print("✅ CSRF token fetched successfully")
            else:
                print(f"❌ Failed to fetch CSRF token: {response.status_code}")
                sys.exit(1)
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            sys.exit(1)

    def _authenticate_user(self):
        """Handle user authentication flow"""
        email = input("Enter your email: ")
        password = getpass.getpass("Enter your password: ")
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/login/",
                json={"email": email, "password": password}
            )
            if response.status_code != 200:
                print(f"❌ Login failed: {response.status_code}")
                sys.exit(1)
            print("✅ Login successful")
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
            sys.exit(1)

    def process_request(self, user_input: str) -> str:
        """Main processing pipeline for user input"""
        intent_data = self.llm_manager.extract_booking_intent(user_input)
        intent_data = self._handle_missing_parameters(intent_data)
        result = self._execute_booking_action(intent_data)
        
        # If confirmation is needed for cancellation, return the confirmation request
        if isinstance(result, dict) and result.get('confirmation_needed'):
            return result
        
        return self._format_agent_response(result, user_input)

    def _handle_missing_parameters(self, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Interactive prompt for missing parameters"""
        intent = intent_data.get('intent')
        
        if intent == 'book_room':
            required = ['room_name', 'date', 'start_time', 'end_time']
            missing = [f for f in required if f not in intent_data]
            
            if missing:
                print("⚠️  Missing booking details:")
                for field in missing:
                    intent_data[field] = self._prompt_for_field(field)
                
                if 'purpose' not in intent_data:
                    intent_data['purpose'] = input("Purpose (default: Meeting): ") or "Meeting"
        
        elif intent == 'modify_booking':
            if 'booking_id' not in intent_data:
                intent_data['booking_id'] = input("Which booking ID to modify? ")
            intent_data.update(self._get_modification_details())
        
        return intent_data

    def _prompt_for_field(self, field: str) -> str:
        """Get user input for missing fields"""
        prompts = {
            'room_name': "Which room would you like to book? ",
            'date': "Date (YYYY-MM-DD/today/tomorrow)? ",
            'start_time': "Start time (HH:MM/10 AM)? ",
            'end_time': "End time (HH:MM/2 PM)? "
        }
        return input(prompts[field])

    def _get_modification_details(self) -> Dict[str, Any]:
        """Collect modification details from user"""
        print("What would you like to change?")
        print("1. Date/Time\n2. Purpose\n3. Participants")
        choice = input("Choice (1-3): ")
        
        if choice == '1':
                return {
                'date': input("New date: "),
                'start_time': input("New start time: "),
                'end_time': input("New end time: ")
            }
        elif choice == '2':
            return {'purpose': input("New purpose: ")}
        elif choice == '3':
            return {'participants': input("New participants: ")}
        return {}

    def _execute_booking_action(self, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute appropriate action based on intent"""
        intent = intent_data.get('intent')
        
        try:
            if intent == 'book_room':
                print("The intent is to book a room")
                
                # Convert room_name to room_id if needed
                if 'room_name' in intent_data:
                    room_id = self.booking_tools._find_room_by_name(intent_data['room_name'])
                    if not room_id:
                        return {
                            "success": False,
                            "error": f"Room not found: {intent_data['room_name']}"
                        }
                    # Replace room_name with room_id in the booking data
                    intent_data['room_id'] = room_id
                    del intent_data['room_name']
                
                # Prepare booking data
                booking_data = {
                    'room_id': intent_data.get('room_id'),
                    'date': intent_data.get('date'),
                    'start_time': intent_data.get('start_time'),
                    'end_time': intent_data.get('end_time'),
                    'purpose': intent_data.get('purpose', 'Meeting'),
                    'participants': intent_data.get('participants')
                }
                
                print("The booking data received is:")
                print(booking_data)
                
                return self.booking_tools.book_room(**booking_data)
                
            elif intent == 'cancel_booking':
                print("Processing cancellation request...")
                
                # Get all active bookings
                bookings_response = self.booking_tools.list_my_bookings()
                
                if not bookings_response.get('success'):
                    return {
                        "success": False,
                        "error": "Failed to fetch your bookings"
                    }
                
                bookings = bookings_response.get('bookings', [])
                if not bookings:
                    return {
                        "success": False,
                        "error": "You don't have any active bookings to cancel"
                    }
                
                # Display bookings in the specified format
                print("\n📋 Your active bookings:")
                for i, booking in enumerate(bookings, 1):
                    room_id = booking.get('room')
                    room_name = booking.get('room_name', f"Room {room_id}")
                    start_time = booking.get('start_time', 'Unknown Time')
                    end_time = booking.get('end_time', 'Unknown Time')
                    date = "Unknown Date"
                    
                    if start_time and isinstance(start_time, str):
                        try:
                            date_obj = datetime.datetime.fromisoformat(start_time)
                            date = date_obj.strftime("%Y-%m-%d")
                        except ValueError:
                            pass
                    
                    purpose = booking.get('purpose', 'Meeting')
                    participants = booking.get('participants', 'no')
                    booking_id = booking.get('id')
                    
                    print(f"{i}. Booking {booking_id} - Room: {room_id} - {room_name} on {date} "
                          f"from {start_time} to {end_time} for {purpose} "
                          f"with {participants} participants")
                
                # Get user selection
                while True:
                    try:
                        choice = input("\nWhich booking would you like to cancel? (enter number or 'x' to cancel): ")
                        
                        if choice.lower() == 'x':
                            return {
                                "success": False,
                                "error": "Operation cancelled by user"
                            }
                        
                        choice_idx = int(choice) - 1
                        if 0 <= choice_idx < len(bookings):
                            selected_booking = bookings[choice_idx]
                            return {
                                "success": True,
                                "confirmation_needed": True,
                                "booking_id": selected_booking['id'],
                                "booking_details": selected_booking,
                                "message": self._format_cancellation_confirmation(selected_booking)
                            }
                        print(f"❌ Invalid selection. Please enter a number between 1 and {len(bookings)}")
                    except ValueError:
                        print("❌ Please enter a valid number or 'x' to cancel")
                    except KeyboardInterrupt:
                        return {
                            "success": False,
                            "error": "Operation cancelled"
                        }
                
            elif intent == 'modify_booking':
                print("Processing modification request...")
                
                # Get all active bookings
                bookings_response = self.booking_tools.list_my_bookings()
                
                if not bookings_response.get('success'):
                    return {
                        "success": False,
                        "error": "Failed to fetch your bookings"
                    }
                
                bookings = bookings_response.get('bookings', [])
                if not bookings:
                    return {
                        "success": False,
                        "error": "You don't have any active bookings to modify"
                    }
                
                # Display bookings in the specified format
                print("\n📋 Your active bookings:")
                for i, booking in enumerate(bookings, 1):
                    room_id = booking.get('room')
                    room_name = booking.get('room_name', f"Room {room_id}")
                    start_time = booking.get('start_time', 'Unknown Time')
                    end_time = booking.get('end_time', 'Unknown Time')
                    
                    # Parse date from start_time
                    date = "Unknown Date"
                    if start_time and isinstance(start_time, str):
                        try:
                            date_obj = datetime.datetime.fromisoformat(start_time)
                            date = date_obj.strftime("%Y-%m-%d")
                        except ValueError:
                            pass
                    
                    purpose = booking.get('purpose', 'Meeting')
                    participants = booking.get('participants', 'no')
                    booking_id = booking.get('id')
                    
                    print(f"{i}. Booking {booking_id} - Room: {room_id} - {room_name} on {date} "
                          f"from {start_time} to {end_time} for {purpose} "
                          f"with {participants} participants")
                
                # Get user selection
                while True:
                    try:
                        choice = input("\nWhich booking would you like to modify? (enter number or 'x' to cancel): ")
                        
                        if choice.lower() == 'x':
                            return {
                                "success": False,
                                "error": "Operation cancelled by user"
                            }
                        
                        choice_idx = int(choice) - 1
                        if 0 <= choice_idx < len(bookings):
                            selected_booking = bookings[choice_idx]
                            break
                        print(f"❌ Invalid selection. Please enter a number between 1 and {len(bookings)}")
                    except ValueError:
                        print("❌ Please enter a valid number or 'x' to cancel")
                
                # Collect new booking details
                print("\n📝 Enter new booking details (press Enter to keep current value):")
                
                # Get room
                new_room = input(f"Room (current: Room {selected_booking['room']}): ").strip()
                if new_room:
                    room_id = self.booking_tools._find_room_by_name(new_room)
                    if not room_id:
                        return {
                            "success": False,
                            "error": f"Room not found: {new_room}"
                        }
                    intent_data['room'] = room_id
                
                # Get date
                current_date = datetime.datetime.fromisoformat(selected_booking['start_time']).strftime("%Y-%m-%d")
                new_date = input(f"Date (current: {current_date}, format: YYYY-MM-DD/today/tomorrow): ").strip()
                if not new_date:
                    new_date = current_date
                
                # Get times
                current_start = datetime.datetime.fromisoformat(selected_booking['start_time']).strftime("%H:%M")
                current_end = datetime.datetime.fromisoformat(selected_booking['end_time']).strftime("%H:%M")
                
                new_start = input(f"Start time (current: {current_start}, format: HH:MM/2 PM): ").strip()
                if not new_start:
                    new_start = current_start
                
                new_end = input(f"End time (current: {current_end}, format: HH:MM/4 PM): ").strip()
                if not new_end:
                    new_end = current_end
                
                # Get purpose and participants
                new_purpose = input(f"Purpose (current: {selected_booking['purpose']}): ").strip()
                if new_purpose:
                    intent_data['purpose'] = new_purpose
                
                current_participants = selected_booking.get('participants', 'No participants')
                new_participants = input(f"Participants (current: {current_participants}): ").strip()
                if new_participants:
                    intent_data['participants'] = new_participants
                
                # Prepare modification data
                modification_data = {
                    'date': new_date,
                    'start_time': new_start,
                    'end_time': new_end
                }
                
                if 'room' in intent_data:
                    modification_data['room'] = intent_data['room']
                if 'purpose' in intent_data:
                    modification_data['purpose'] = intent_data['purpose']
                if 'participants' in intent_data:
                    modification_data['participants'] = intent_data['participants']
                
                # Call modify_booking with the booking ID and new data
                return self.booking_tools.modify_booking(selected_booking['id'], **modification_data)
            
            return {"success": False, "error": "Unrecognized intent"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _format_booking_details(self, booking: Dict[str, Any]) -> str:
        """Format booking details for display"""
        # Extract room name or ID
        room_name = f"Room {booking.get('room')}" if 'room' in booking else "Unknown Room"
        
        # Extract date and time
        start_time = booking.get('start_time', 'Unknown Time')
        end_time = booking.get('end_time', 'Unknown Time')
        
        # Parse date from start_time if available
        date = "Unknown Date"
        if start_time and isinstance(start_time, str):
            try:
                date_obj = datetime.datetime.fromisoformat(start_time)
                date = date_obj.strftime("%Y-%m-%d")
            except ValueError:
                pass
        
        # Extract purpose
        purpose = booking.get('purpose', 'Meeting')
        
        return f"{room_name} on {date} from {start_time} to {end_time} for '{purpose}'"

    def _format_cancellation_confirmation(self, booking: Dict[str, Any]) -> str:
        """Format a user-friendly confirmation message"""
        print('Retrieving room name')
        
        # Extract room name or ID
        room_name = f"Room {booking.get('room')}" if 'room' in booking else "Unknown Room"
        
        # Extract date and time
        start_time = booking.get('start_time', 'Unknown Time')
        end_time = booking.get('end_time', 'Unknown Time')
        
        # Parse date from start_time if available
        date = "Unknown Date"
        if start_time and isinstance(start_time, str):
            try:
                date_obj = datetime.datetime.fromisoformat(start_time)
                date = date_obj.strftime("%Y-%m-%d")
            except ValueError:
                pass
        
        # Extract purpose and participants
        purpose = booking.get('purpose', 'Meeting')
        participants = booking.get('participants', 'No participants')
        
        return f"Are you sure you want to cancel your booking for {room_name} on {date} " \
               f"from {start_time} to {end_time} for '{purpose}' " \
               f"with {participants}? (yes/no)"

    def process_confirmation(self, user_response: str, booking_id: int) -> Dict[str, Any]:
        """Handle user's confirmation response"""
        if user_response.lower() in ['yes', 'y', 'confirm', 'sure', 'ok']:
            # User confirmed, proceed with cancellation
            print(f"🔄 Processing cancellation for booking {booking_id}")
            cancellation_result = self.booking_tools.cancel_booking(booking_id)
            
            if cancellation_result.get('success'):
                return {
                    "success": True,
                    "message": "Booking has been successfully cancelled!"
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to cancel booking: {cancellation_result.get('error', 'Unknown error')}"
                }
        else:
            return {
                "success": True,
                "message": "Cancellation was aborted. Your booking remains active."
            }

    def _format_agent_response(self, result: Dict[str, Any], user_input: str) -> str:
        """Generate user-friendly response"""
        if isinstance(result, str):
            # If result is already a string, return it directly
            return result
        
        if result.get('success'):
            return result.get('message', "Operation completed successfully!")
        
        # Ensure error is a dictionary before calling get
        error = result.get('error', {})
        if isinstance(error, dict):
            error_message = error.get('detail', "Unknown error")
        else:
            error_message = str(error)
        
        return self.llm_manager.generate_response(user_input, {"error": error_message})

def main():
    """CLI entry point"""
    print("\n🏢 Smart Room Booking Assistant")
    print("-------------------------------")
    agent = BookingAgent()
    
    print("\n🤖 How can I help you today? (type 'exit' to quit)\n")
    
    # Add state tracking for confirmations
    pending_confirmation = None
    
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['exit', 'quit']:
                print("\n👋 Goodbye!")
                break
            
            # Handle pending confirmation if exists
            if pending_confirmation:
                response = agent.process_confirmation(user_input, pending_confirmation)
                pending_confirmation = None  # Reset confirmation state
            else:
                # Normal request processing
                response = agent.process_request(user_input)
                
                # Check if confirmation is needed
                if isinstance(response, dict) and response.get('confirmation_needed'):
                    pending_confirmation = response.get('booking_id')
                    print(f"\n🤖 {response.get('message', '')}")
                    continue
            
            # Display response
            if isinstance(response, dict):
                message = response.get('message', 'Operation completed successfully!')
            else:
                message = str(response)
            
            print(f"\n🤖 {message}")
            
        except KeyboardInterrupt:
            print("\n🚨 Operation cancelled")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")
            # Log the full traceback for debugging
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
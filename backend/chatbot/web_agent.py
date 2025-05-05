import os
import django
import datetime
import json
import sys
import requests
from typing import Dict, Any, Optional, List
from main import BookingAgent
from booking_tools import BookingTools
from llm_utils import LLMManager

class WebBookingAgent(BookingAgent):
    """
    A modified version of BookingAgent suitable for web usage
    that doesn't depend on console input/output
    """
    
    def __init__(self, user_email=None):
        """Initialize agent without console prompts"""
        self.base_url = "http://127.0.0.1:8000"
        self.session = requests.Session()
        self.llm_manager = LLMManager()
        self.booking_tools = None
        self.user_email = user_email
        self.conversation_history = []
        self.current_intent = None
        self.collected_info = {}
        self.available_bookings = []  # Store available bookings for cancellation
        
        # Skip the interactive authentication
        self.booking_tools = BookingTools(base_url=self.base_url, session=self.session)
    
    def set_session(self, session_cookies):
        """
        Set the session cookies from the Django request
        
        Args:
            session_cookies: Dict containing cookies from the Django request
        """
        for key, value in session_cookies.items():
            self.session.cookies.set(key, value)
        
        # Ensure we have a CSRF token
        csrf_token = self.session.cookies.get('csrftoken')
        if not csrf_token:
            # Try to get one
            self._get_csrf_token()
    
    def process_request(self, user_input: str) -> Dict[str, Any]:
        """Process user request with incremental information gathering"""
        # Add user input to conversation history
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Extract booking intent using LLM
        intent_data = self.llm_manager.extract_booking_intent(user_input)
        
        # Check for modification intent directly from user input
        # This ensures we properly handle "modify my booking" requests
        if any(phrase in user_input.lower() for phrase in ["modify my booking", "modify booking", "change my booking", "update my booking", "edit my booking"]):
            intent_data["intent"] = "modify_booking"
        
        # Special case: If we have available bookings and the message looks like a selection
        if self.available_bookings and (user_input.isdigit() or "booking" in user_input.lower()):
            # Check if the user is selecting a booking by number
            booking_number = None
            
            if user_input.isdigit():
                booking_number = int(user_input)
            else:
                # Try to extract a number from phrases like "cancel booking 2" or "booking number 2"
                import re
                match = re.search(r'(\d+)', user_input)
                if match:
                    booking_number = int(match.group(1))
            
            if booking_number and 1 <= booking_number <= len(self.available_bookings):
                # User has selected a booking by number
                # Determine if this is for cancellation or modification based on current intent
                if self.current_intent == 'cancel_booking':
                    intent_data = {
                        "intent": "select_booking_to_cancel",
                        "booking_number": booking_number,
                        "booking_id": self.available_bookings[booking_number-1].get('id')
                    }
                elif self.current_intent == 'modify_booking':
                    intent_data = {
                        "intent": "select_booking_to_modify",
                        "booking_number": booking_number,
                        "booking_id": self.available_bookings[booking_number-1].get('id')
                    }
        
        # If there's a current intent, merge new information with previously collected info
        if self.current_intent:
            # Keep existing intent if no new intent detected
            if intent_data.get('intent') == 'unknown' or not intent_data.get('intent'):
                intent_data['intent'] = self.current_intent
                
            # Merge newly extracted information with previously collected info
            for key, value in intent_data.items():
                if key != 'intent':
                    self.collected_info[key] = value
            
            # Use the merged information for processing
            for key, value in self.collected_info.items():
                if key != 'intent':
                    intent_data[key] = value
        else:
            # First message in a booking sequence - start collecting information
            self.current_intent = intent_data.get('intent')
            self.collected_info = {key: value for key, value in intent_data.items()}
        
        # Special case for modify_booking: don't require booking_id upfront
        if intent_data.get('intent') == 'modify_booking' and 'booking_id' not in intent_data:
            # We'll fetch the list of bookings instead of asking for an ID
            self.current_intent = 'modify_booking'
            return self._execute_booking_action(intent_data)
        
        # Check for missing parameters with the combined information
        missing_params = self._check_missing_parameters(intent_data)
        
        # If we still have missing parameters after multiple exchanges
        if missing_params:
            # Store the current intent for the next message
            self.current_intent = intent_data.get('intent')
            
            # Generate a conversational response asking for specific missing info
            response = {
                "success": False,
                "missing_parameters": missing_params,
                "message": self._generate_missing_params_message(user_input, missing_params)
            }
            
            # Add response to conversation history
            self.conversation_history.append({"role": "assistant", "content": response["message"]})
            return response
        
        # We have all the info we need - execute the booking action
        result = self._execute_booking_action(intent_data)
        
        # Reset the current intent and collected info after successful execution
        # unless we're in a multi-step flow like cancellation which needs continuation
        if not (isinstance(result, dict) and 
                (result.get('confirmation_needed') or 
                 result.get('action') == 'list_bookings_for_cancellation' or
                 result.get('action') == 'list_bookings_for_modification')):
            self.current_intent = None
            self.collected_info = {}
            self.available_bookings = []
        
        # If confirmation is needed, format the message
        if isinstance(result, dict) and result.get('confirmation_needed'):
            result["message"] = self._generate_confirmation_message(user_input, result)
            self.conversation_history.append({"role": "assistant", "content": result["message"]})
            return result
        
        # Use LLM to generate a conversational response unless we're returning special data
        if not (isinstance(result, dict) and 
                (result.get('action') == 'list_bookings_for_cancellation' or
                 result.get('action') == 'list_bookings_for_modification')):
            message = self.llm_manager.generate_response(user_input, result)
            result["message"] = message
        
        # Add response to conversation history
        self.conversation_history.append({"role": "assistant", "content": result["message"]})
        
        # Add the message to the result
        if not isinstance(result, dict):
            result = {"success": True, "message": result}
            
        return result
    
    def _generate_missing_params_message(self, user_input: str, missing_params: list) -> str:
        """Generate a friendly message asking for only the next piece of missing information"""
        # Find the most important missing parameter to ask about first
        param_priority = ['room_name', 'date', 'start_time', 'end_time', 'purpose', 'participants']
        next_param = next((p for p in param_priority if p in missing_params), missing_params[0])
        
        context = {
            "missing_parameter": next_param,
            "user_input": user_input,
            "already_collected": self.collected_info,
            "ask_for_one_parameter": True,
            "conversation_history": self.conversation_history[-5:] if len(self.conversation_history) > 5 else self.conversation_history
        }
        return self.llm_manager.generate_response(
            f"Ask naturally for this specific missing information: {next_param}",
            context
        )
    
    def _generate_confirmation_message(self, user_input: str, result: Dict[str, Any]) -> str:
        """Generate a conversational confirmation message using LLM"""
        context = {
            "requires_confirmation": True,
            "booking_details": result.get('booking_details', {}),
            "action": "cancel booking" if result.get('booking_id') else "unknown action",
            "conversation_history": self.conversation_history[-5:] if len(self.conversation_history) > 5 else self.conversation_history
        }
        return self.llm_manager.generate_response(
            "Ask for confirmation naturally",
            context
        )
    
    def process_confirmation(self, user_response: str, booking_id: int) -> Dict[str, Any]:
        """Handle user's confirmation response with conversational replies"""
        # Add the user's confirmation response to conversation history
        self.conversation_history.append({"role": "user", "content": user_response})
        
        # Reset intent and collected info after confirmation flow
        self.current_intent = None
        self.collected_info = {}
        self.available_bookings = []  # Clear available bookings
        
        # Process simple yes/no responses and variations
        confirmation = False
        if user_response.lower() in ['yes', 'y', 'confirm', 'sure', 'ok', 'yep', 'yeah']:
            confirmation = True
            
        if confirmation:
            # User confirmed, proceed with cancellation
            cancellation_result = self.booking_tools.cancel_booking(booking_id)
            
            # Debug logging
            print(f"Cancellation attempt for booking {booking_id}, result: {cancellation_result}")
            
            if cancellation_result.get('success'):
                result = {
                    "success": True,
                    "message": f"Your booking has been successfully cancelled. You will receive a confirmation email shortly."
                }
            else:
                error = cancellation_result.get('error', "An unknown error occurred")
                status_code = cancellation_result.get('status_code')
                
                # Handle specific error cases
                if status_code == 403:
                    message = "You don't have permission to cancel this booking. Please contact the administrator."
                elif status_code == 404:
                    message = "This booking could not be found. It may have already been cancelled."
                else:
                    message = f"I couldn't cancel your booking: {error}"
                
                result = {
                    "success": False,
                    "error": error,
                    "message": message
                }
        else:
            # User declined the cancellation
            result = {
                "success": True,
                "message": "I've kept your booking as is. Let me know if there's anything else I can help you with."
            }
            
        # Add response to conversation history
        self.conversation_history.append({"role": "assistant", "content": result["message"]})
        return result
    
    def _check_missing_parameters(self, intent_data: Dict[str, Any]) -> list:
        """Check for missing parameters without prompting"""
        intent = intent_data.get('intent')
        missing = []
        
        if intent == 'book_room':
            # Add purpose and participants as required fields
            required = ['room_name', 'date', 'start_time', 'end_time', 'purpose', 'participants']
            missing = [f for f in required if f not in intent_data]
        
        # Modify booking now requires a booking_id for an initial request
        # Later the specific fields to modify will be collected
        elif intent in ['modify_booking', 'select_booking_to_modify']:
            if 'booking_id' not in intent_data:
                missing.append('booking_id')
                
        return missing
    
    def _get_csrf_token(self):
        """Fetch CSRF token from Django server without console output"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/csrf/")
            return self.session.cookies.get('csrftoken')
        except requests.exceptions.RequestException:
            return None
    
    def _execute_booking_action(self, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Override the execute_booking_action method for web integration"""
        intent = intent_data.get('intent')
        
        try:
            if intent == 'book_room':
                # Use existing book_room implementation
                return super()._execute_booking_action(intent_data)
                
            elif intent == 'cancel_booking':
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
                
                # Store bookings for later use
                self.available_bookings = bookings
                
                # Format bookings for display in the chatbot
                formatted_bookings = []
                for i, booking in enumerate(bookings):
                    formatted_booking = self._format_booking_for_display(booking)
                    formatted_bookings.append(formatted_booking)
                
                # For the web frontend, return a message with the list of bookings
                return {
                    "success": True,
                    "message": "Here are your active bookings. Which one would you like to cancel?",
                    "booking_list": formatted_bookings,
                    "action": "list_bookings_for_cancellation"
                }
            
            elif intent == 'modify_booking':
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
                
                # Store bookings for later use
                self.available_bookings = bookings
                
                # Format bookings for display in the chatbot
                formatted_bookings = []
                for booking in bookings:
                    formatted_booking = self._format_booking_for_display(booking)
                    formatted_bookings.append(formatted_booking)
                
                # Return formatted list for modification
                return {
                    "success": True,
                    "message": "Here are your active bookings. Which one would you like to modify?",
                    "booking_list": formatted_bookings,
                    "action": "list_bookings_for_modification"
                }
            
            elif intent == 'select_booking_to_cancel':
                # Extract booking selection from intent data
                booking_id = intent_data.get('booking_id')
                booking_number = intent_data.get('booking_number')
                
                # If we have a booking number (e.g., "cancel booking 2"), convert to ID
                if booking_number and not booking_id and self.available_bookings:
                    try:
                        number = int(booking_number)
                        if 1 <= number <= len(self.available_bookings):
                            booking_id = self.available_bookings[number-1].get('id')
                    except (ValueError, TypeError):
                        pass
                
                if not booking_id:
                    return {
                        "success": False,
                        "error": "Please specify which booking you'd like to cancel"
                    }
                
                # Find the booking details for the selected ID
                booking_details = None
                for booking in self.available_bookings:
                    if str(booking.get('id')) == str(booking_id):
                        booking_details = booking
                        break
                
                if not booking_details:
                    return {
                        "success": False,
                        "error": f"Booking with ID {booking_id} not found"
                    }
                
                # Return confirmation request
                return {
                    "success": True,
                    "confirmation_needed": True,
                    "booking_id": booking_id,
                    "booking_details": booking_details,
                    "message": self._format_cancellation_confirmation(booking_details)
                }

            elif intent == 'select_booking_to_modify':
                # Extract booking selection from intent data
                booking_id = intent_data.get('booking_id')
                booking_number = intent_data.get('booking_number')
                
                # If we have a booking number (e.g., "modify booking 2"), convert to ID
                if booking_number and not booking_id and self.available_bookings:
                    try:
                        number = int(booking_number)
                        if 1 <= number <= len(self.available_bookings):
                            booking_id = self.available_bookings[number-1].get('id')
                    except (ValueError, TypeError):
                        pass
                
                if not booking_id:
                    return {
                        "success": False,
                        "error": "Please specify which booking you'd like to modify"
                    }
                
                # Find the booking details for the selected ID
                booking_details = None
                for booking in self.available_bookings:
                    if str(booking.get('id')) == str(booking_id):
                        booking_details = booking
                        break
                
                if not booking_details:
                    return {
                        "success": False,
                        "error": f"Booking with ID {booking_id} not found"
                    }

                # Clear current intent and info to prepare for collecting modification details
                self.current_intent = None
                self.collected_info = {}
                
                # Create a URL for modification
                base_url = self.base_url
                # Use either the host from HTTP_HOST or default to localhost
                if base_url.startswith('http://127.0.0.1'):
                    # Local development
                    modification_url = f"{base_url}/app/bookings/modify/{booking_id}"
                else:
                    # Production setup - assume HTTPS and no port needed
                    modification_url = f"{base_url}/app/bookings/modify/{booking_id}"
                
                # Return a response with booking details and modification URL
                return {
                    "success": True,
                    "message": f"I've found your booking for {booking_details.get('room_name')} on {booking_details.get('date')}. You can modify it using the booking form that will open.",
                    "booking_details": booking_details,
                    "modification_url": modification_url,
                }
            
            # For other intents, use the parent implementation
            return super()._execute_booking_action(intent_data)
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _format_booking_for_display(self, booking: Dict[str, Any]) -> Dict[str, Any]:
        """Format booking data for display in the chatbot UI"""
        room_id = booking.get('room')
        room_name = booking.get('room_name', f"Room {room_id}")
        start_time = booking.get('start_time', 'Unknown Time')
        end_time = booking.get('end_time', 'Unknown Time')
        
        # Parse date from start_time
        date = "Unknown Date"
        if start_time and isinstance(start_time, str):
            try:
                date_obj = datetime.datetime.fromisoformat(start_time)
                date = date_obj.strftime("%b %d, %Y")  # Format date as "May 6, 2025"
                # Format times nicely
                start_display = date_obj.strftime("%I:%M %p").lstrip('0')  # Remove leading zero
                end_obj = datetime.datetime.fromisoformat(end_time)
                end_display = end_obj.strftime("%I:%M %p").lstrip('0')  # Remove leading zero
            except ValueError:
                start_display = start_time
                end_display = end_time
        else:
            start_display = start_time
            end_display = end_time
        
        # Store the original ISO format times for backend use
        original_start = start_time
        original_end = end_time
        
        purpose = booking.get('purpose', 'Meeting')
        participants = booking.get('participants', 'No participants')
        
        return {
            "id": booking.get('id'),
            "room_name": room_name,
            "date": date,
            "start_time": start_display,
            "end_time": end_display,
            "purpose": purpose,
            "participants": participants,
            "original_start": original_start,
            "original_end": original_end,
            "building_name": booking.get('building_name', '')
        }
    
    def _format_cancellation_confirmation(self, booking_details: Dict[str, Any]) -> str:
        """Format a cancellation confirmation message with properly formatted date and time"""
        room_name = booking_details.get('room_name', 'Unknown Room')
        
        # Format the date and time nicely
        start_time = booking_details.get('start_time', 'Unknown Time')
        end_time = booking_details.get('end_time', 'Unknown Time')
        purpose = booking_details.get('purpose', '')
        
        # If we have original ISO format, parse it for better formatting
        if 'original_start' in booking_details and booking_details['original_start']:
            try:
                date_obj = datetime.datetime.fromisoformat(booking_details['original_start'])
                date = date_obj.strftime("%B %d, %Y")  # Format as "May 6, 2025"
                start = date_obj.strftime("%I:%M %p").lstrip('0')  # Format as "4:00 PM" (no leading zero)
                
                end_obj = datetime.datetime.fromisoformat(booking_details['original_end'])
                end = end_obj.strftime("%I:%M %p").lstrip('0')  # Format as "5:00 PM" (no leading zero)
            except (ValueError, TypeError):
                # Use the pre-formatted values if parsing fails
                date = booking_details.get('date', 'Unknown Date')
                start = start_time
                end = end_time
        else:
            # Use the pre-formatted values
            date = booking_details.get('date', 'Unknown Date')
            start = start_time
            end = end_time
                
        # Build the confirmation message
        message = f"I see you have a booking for Room {room_name}"
        
        # Add location if available
        building = booking_details.get('building_name')
        if building:
            message += f" in the {building}"
        
        # Add date and time
        message += f" on {date} from {start} to {end}"
        
        # Add purpose if available
        if purpose:
            message += f" for {purpose}"
            
        # Add the confirmation question
        message += ".\n\nJust to confirm, is this the booking you'd like to cancel?"
        
        return message
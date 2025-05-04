import os
import json
import requests
from typing import Dict, Optional, Any, List
from dotenv import load_dotenv
from bookings.models import Booking
from django.utils import timezone

# Load environment variables
load_dotenv("C:/Users/Rishi/Desktop/plek/backend/.env")

class LLMManager:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment variables")
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "google/gemma-3-12b-it:free"
    
    def extract_booking_intent(self, user_message: str) -> Dict[str, Any]:
        """Extract booking intent and parameters from user message using Gemma LLM"""
        system_prompt = """You are a helpful assistant for a room booking system.
        Extract the following from the user message:
        - intent (book_room, modify_booking, or cancel_booking)
        - room_name (if mentioned)
        - date (if mentioned)
        - start_time (if mentioned)
        - end_time (if mentioned)
        - purpose (if mentioned)
        - participants (number of participants if mentioned)

        For ANY mention of cancellation or deletion, set intent as "cancel_booking".
        Parse dates in any format to YYYY-MM-DD.
        Parse times in any format to standard 12-hour format (e.g., "3 PM").
        For participant counts, extract just the number.

        Return a JSON with all these fields that are found in the message.
        Always include the intent field.
        """
        
        try:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            }
            
            headers = {
                "HTTP-Referer": "https://plek.com",  # Required by OpenRouter
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            
            response_data = response.json()
            
            # Handle different response formats
            if "choices" in response_data:
                content = response_data["choices"][0]["message"]["content"]
            elif "output" in response_data:  # New format check
                content = response_data["output"]
            else:
                raise ValueError("Unexpected LLM response format")
            
            # Try to parse the LLM response as JSON
            try:
                
                if '```json' in content:
                    content = content.split('```json')[1].split('```')[0].strip()
                elif '```' in content:
                    content = content.split('```')[1].split('```')[0].strip()
                    
                parsed_data = json.loads(content)
                print(f"✅ Parsed intent data: {json.dumps(parsed_data, indent=2)}")
                return parsed_data
            except json.JSONDecodeError as e:
                print(f'⚠️ JSON Decode Error: {str(e)}')
                print(f"Raw LLM Response: {content}")
                # Fallback to extracting from text if JSON parsing fails
                return self._extract_from_text(content)
            
        except Exception as e:
            print(f"❌ Error extracting intent: {str(e)}")
            print(f"Full LLM Response: {response.text if 'response' in locals() else 'No response'}")
            return {"intent": "unknown", "error": str(e)}
    
    def _extract_from_text(self, text: str) -> Dict[str, Any]:
        """
        Fallback method to extract data from non-JSON formatted text
        """
        result = {"intent": "unknown"}
        
        # Simple heuristics to extract intent
        if any(x in text.lower() for x in ["book", "reserve", "schedule"]):
            result["intent"] = "book_room"
        elif any(x in text.lower() for x in ["cancel", "delete"]):
            result["intent"] = "cancel_booking"
        elif any(x in text.lower() for x in ["modify", "change", "update", "reschedule", "move", "edit"]):
            result["intent"] = "modify_booking"
        
        # Return basic parsing
        return result
        
    def generate_response(self, user_message: str, booking_info: Optional[Dict[str, Any]] = None) -> str:
        """Generate a natural language response"""
        system_prompt = """You are a helpful room booking assistant. 
        Respond to the user based on their message and the booking information provided.
        Keep your responses conversational, helpful, and concise.
        If the error message contains 'Operation cancelled by user', respond with a message indicating 
        that the cancellation was aborted and the booking remains active.
        """
        
        # Check if this was a cancelled operation
        if booking_info and isinstance(booking_info.get('error'), str):
            if 'Operation cancelled by user' in booking_info['error']:
                return "Okay, I've kept your booking active. Let me know if you need anything else!"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # Add booking info if available
        if booking_info:
            booking_context = f"Context: {json.dumps(booking_info)}"
            messages.append({"role": "user", "content": booking_context})
        
        try:
            payload = {
                "model": self.model,
                "messages": messages
            }
            
            headers = {
                "HTTP-Referer": "https://plek.com",
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            
            response_data = response.json()
            content = response_data["choices"][0]["message"]["content"]
            return content
            
        except Exception as e:
            print(f"❌ Error generating response: {str(e)}")
            return f"I'm sorry, I encountered an error while processing your request: {str(e)}"
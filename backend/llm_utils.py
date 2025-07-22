import os
import json
import requests
from typing import Dict, Optional, Any, List
from dotenv import load_dotenv
from bookings.models import Booking
from django.utils import timezone

load_dotenv("backend/.env")

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
        
    def generate_response(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate a natural language response"""
        system_prompt = """You are a helpful and friendly room booking assistant named Plek Assistant. 
        Your personality is professional but warm, helpful, and slightly witty.
        
        Respond to the user based on their message and the context provided.
        
        Keep your responses conversational and natural-sounding while being informative.
        Make references to previous parts of the conversation when relevant.
        
        When asking for missing information:
        - Ask for ONE piece of information at a time in a natural, conversational way
        - Don't use bullet points or numbered lists
        - Frame your question as a natural follow-up to what the user said
        - Avoid mentioning "missing parameters" or using technical terms
        - For room_name: Ask which room they'd like to book
        - For date: Ask when they need the room
        - For start_time: Ask what time they'd like to start
        - For end_time: Ask until what time they need the room
        - For purpose: Ask what the meeting or event is about, or what the purpose of their booking is
        - For participants: Ask how many people will be attending or if they'd like to add any specific attendees
        - Also ask if they have any additional notes or requirements for their booking
        - Acknowledge any information they've already provided
        
        When responding to booking-related actions:
        - For successful actions: Be enthusiastic and congratulatory
        - For errors: Be empathetic and helpful, suggesting solutions when possible
        - For confirmations: Clearly state what the user is confirming but ask in a natural way
        
        Tailor your language based on the context - formal for business meetings, casual for social gatherings.
        
        Current date for reference: May 5, 2025.
        """
        
        # If we're specifically asking for a single missing parameter, add to the system prompt
        if context and context.get('ask_for_one_parameter') and context.get('missing_parameter'):
            next_param = context['missing_parameter']
            already_collected = context.get('already_collected', {})
            
            # Add specific instructions to focus on just one parameter
            system_prompt += f"\n\nIn this response, ONLY ask for the '{next_param}' in a natural way."
            system_prompt += "\nDon't list all required information or mention 'missing parameters'."
            
            # Include what we already know
            if already_collected:
                system_prompt += "\n\nInformation already collected:"
                for key, value in already_collected.items():
                    if key != 'intent':
                        system_prompt += f"\n- {key}: {value}"
        
        # Check if this was a cancelled operation
        if context and isinstance(context.get('error'), str):
            if 'Operation cancelled by user' in context['error']:
                return "Okay, I've kept your booking active. Let me know if you need anything else!"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # Add conversation history if available
        if context and 'conversation_history' in context:
            # We'll skip this in the messages to the LLM since we'll use the history directly
            history = context.pop('conversation_history')
            if history and len(history) > 0:
                # Insert the conversation history before the current user message
                messages = [{"role": "system", "content": system_prompt}]
                messages.extend(history[:-1])  # Add all but the last user message (which we already have)
                messages.append({"role": "user", "content": user_message})
        
        # Add context if available
        if context:
            context_str = json.dumps(context)
            messages.append({"role": "user", "content": f"Context: {context_str}"})
        
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            headers = {
                "HTTP-Referer": "https://plek.com",
                "X-Title": "Plek Room Booking Assistant",
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
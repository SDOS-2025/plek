import json
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

# Import the WebBookingAgent
from .web_agent import WebBookingAgent

logger = logging.getLogger(__name__)

class ChatbotView(APIView):
    """
    API view for interacting with the chatbot
    """
    permission_classes = [IsAuthenticated]
    
    # Dictionary to store agent instances for each user
    # This preserves conversation history across requests
    _agent_instances = {}
    
    def _get_agent_for_user(self, user_id, session_cookies):
        """Get or create a WebBookingAgent instance for a specific user"""
        if user_id not in self._agent_instances:
            # Create a new agent for this user
            self._agent_instances[user_id] = WebBookingAgent(user_email=user_id)
            
            # Set session cookies if provided
            if session_cookies:
                self._agent_instances[user_id].set_session(session_cookies)
        
        # Ensure the agent's session is updated with current cookies
        elif session_cookies:
            self._agent_instances[user_id].set_session(session_cookies)
            
        return self._agent_instances[user_id]
        
    def post(self, request):
        """Process a message to the chatbot"""
        message = request.data.get('message')
        if not message:
            return Response(
                {"detail": "No message provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the agent for this user, creating one if needed
        user_id = request.user.email
        agent = self._get_agent_for_user(user_id, request.COOKIES)
        
        # Process the request
        try:
            response = agent.process_request(message)
            
            # If this is a modification with a URL, also include the modification URL
            if 'modification_url' in response:
                # Return the modification URL along with the regular response
                return Response({
                    'message': response.get('message', 'Found the booking to modify'),
                    'booking_details': response.get('booking_details'),
                    'modification_url': response.get('modification_url'),
                    'requires_confirmation': False,
                })
                
            # If this is a booking list for modification, include the appropriate data
            if response.get('action') == 'list_bookings_for_modification':
                return Response({
                    'message': response.get('message', 'Here are your bookings. Which one would you like to modify?'),
                    'booking_list': response.get('booking_list', []),
                    'action': 'list_bookings_for_modification',
                    'requires_confirmation': False,
                })
                
            # If this is a booking list for cancellation, include booking list data
            if response.get('action') == 'list_bookings_for_cancellation':
                return Response({
                    'message': response.get('message', 'Here are your bookings. Which one would you like to cancel?'),
                    'booking_list': response.get('booking_list', []),
                    'action': 'list_bookings_for_cancellation',
                    'requires_confirmation': False,
                })
            
            # If this is a confirmation request, preserve the confirmation flag and booking details
            if response.get('confirmation_needed'):
                # Store the booking ID in the session for use in confirmation
                booking_id = response.get('booking_id')
                
                return Response({
                    'message': response.get('message', 'Please confirm this action.'),
                    'requires_confirmation': True,
                    'booking_details': response.get('booking_details'),
                })
                
            # Regular response with message
            return Response({
                'message': response.get('message', 'I processed your request.'),
                'booking_details': response.get('booking_details'),
                'requires_confirmation': False,
            })
            
        except Exception as e:
            logger.exception(f"Error processing chatbot request: {str(e)}")
            return Response(
                {"detail": "An error occurred while processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """Process a confirmation response"""
        message = request.data.get('message', '')
        confirm = request.data.get('confirm', False)
        
        # Get the agent for this user
        user_id = request.user.email
        agent = self._get_agent_for_user(user_id, request.COOKIES)
        
        # Find the most recent booking ID in the agent's conversation history
        # This is a workaround as we're not storing it in the session
        booking_id = None
        for message in reversed(agent.conversation_history):
            if message['role'] == 'assistant' and 'booking_id' in message.get('content', {}):
                booking_id = message['content']['booking_id']
                break
        
        if not booking_id:
            # Try to find the booking ID in other ways
            for message in reversed(agent.conversation_history):
                if message['role'] == 'assistant' and 'booking details' in message.get('content', '').lower():
                    # Look for a booking ID pattern
                    import re
                    match = re.search(r'booking .*?(\d+)', message.get('content', ''), re.IGNORECASE)
                    if match:
                        booking_id = match.group(1)
                        break
            
        if not booking_id and agent.available_bookings:
            # If we still don't have a booking ID but we have a selected booking, use that
            booking_id = agent.available_bookings[0].get('id')
        
        if not booking_id:
            return Response(
                {"detail": "No booking found to confirm action on"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process the confirmation
        try:
            response = agent.process_confirmation(message, booking_id)
            
            return Response({
                'message': response.get('message', 'Your confirmation was processed.'),
                'requires_confirmation': False,
            })
            
        except Exception as e:
            logger.exception(f"Error processing chatbot confirmation: {str(e)}")
            return Response(
                {"detail": "An error occurred while processing your confirmation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
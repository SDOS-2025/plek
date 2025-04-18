import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from allauth.socialaccount.models import SocialToken, SocialAccount

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    """
    Service for interacting with Google Calendar API
    """

    def __init__(self, user_id):
        self.user_id = user_id
        self.credentials = self._get_credentials()
        self.service = self._build_service() if self.credentials else None

    def _get_credentials(self) -> Optional[Credentials]:
        """
        Get Google OAuth credentials for the user
        """
        try:
            # Get the user's social account
            social_account = SocialAccount.objects.filter(
                user_id=self.user_id, provider="google"
            ).first()

            if not social_account:
                logger.warning(f"No Google social account found for user {self.user_id}")
                return None

            # Get the access token
            token = SocialToken.objects.filter(account=social_account).first()
            if not token:
                logger.warning(f"No token found for Google account of user {self.user_id}")
                return None

            # Create credentials object
            credentials = Credentials(
                token=token.token,
                refresh_token=token.token_secret,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.SOCIALACCOUNT_PROVIDERS["google"]["APP"]["client_id"],
                client_secret=settings.SOCIALACCOUNT_PROVIDERS["google"]["APP"]["secret"],
                scopes=settings.SOCIALACCOUNT_PROVIDERS["google"]["SCOPE"],
            )

            return credentials
        except Exception as e:
            logger.error(f"Error getting Google credentials: {str(e)}")
            return None

    def _build_service(self):
        """
        Build the Google Calendar service
        """
        try:
            return build("calendar", "v3", credentials=self.credentials)
        except Exception as e:
            logger.error(f"Error building Google Calendar service: {str(e)}")
            return None

    def list_calendars(self) -> List[Dict]:
        """
        List available calendars for the user
        """
        if not self.service:
            logger.error("Calendar service not initialized")
            return []

        try:
            calendars = []
            page_token = None
            
            while True:
                calendar_list = self.service.calendarList().list(pageToken=page_token).execute()
                for calendar_entry in calendar_list['items']:
                    calendars.append({
                        'id': calendar_entry['id'],
                        'summary': calendar_entry['summary'],
                        'primary': calendar_entry.get('primary', False)
                    })
                
                page_token = calendar_list.get('nextPageToken')
                if not page_token:
                    break
                    
            return calendars
        except HttpError as error:
            logger.error(f"Error listing calendars: {error}")
            return []

    def create_event(self, calendar_id: str, booking) -> Optional[Dict]:
        """
        Create a calendar event for a booking
        """
        if not self.service:
            logger.error("Calendar service not initialized")
            return None

        try:
            # Format event details
            start_time = booking.start_time.isoformat()
            end_time = booking.end_time.isoformat()
            
            # Create event body
            event_body = {
                'summary': f"Room Booking: {booking.room.name}",
                'location': f"{booking.room.building.name}, {booking.room.floor.name if booking.room.floor.name else 'Floor ' + str(booking.room.floor.number)}",
                'description': f"Purpose: {booking.purpose}\nParticipants: {booking.participants or 'None'}\nNotes: {booking.notes or 'None'}",
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'Asia/Kolkata',
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'Asia/Kolkata',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 60},
                        {'method': 'popup', 'minutes': 30},
                    ],
                },
            }
            
            # Create the event
            event = self.service.events().insert(calendarId=calendar_id, body=event_body).execute()
            logger.info(f"Event created: {event.get('htmlLink')}")
            
            return {
                'event_id': event['id'],
                'html_link': event.get('htmlLink'),
                'status': event['status']
            }
        except HttpError as error:
            logger.error(f"Error creating calendar event: {error}")
            return None

    def update_event(self, calendar_id: str, event_id: str, booking) -> Optional[Dict]:
        """
        Update an existing calendar event
        """
        if not self.service:
            logger.error("Calendar service not initialized")
            return None

        try:
            # Format event details
            start_time = booking.start_time.isoformat()
            end_time = booking.end_time.isoformat()
            
            # Create event body with updated information
            event_body = {
                'summary': f"Room Booking: {booking.room.name}",
                'location': f"{booking.room.building.name}, {booking.room.floor.name if booking.room.floor.name else 'Floor ' + str(booking.room.floor.number)}",
                'description': f"Purpose: {booking.purpose}\nParticipants: {booking.participants or 'None'}\nNotes: {booking.notes or 'None'}",
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'Asia/Kolkata',
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'Asia/Kolkata',
                },
            }
            
            # Update the event
            event = self.service.events().update(
                calendarId=calendar_id, 
                eventId=event_id, 
                body=event_body
            ).execute()
            
            logger.info(f"Event updated: {event.get('htmlLink')}")
            
            return {
                'event_id': event['id'],
                'html_link': event.get('htmlLink'),
                'status': event['status']
            }
        except HttpError as error:
            logger.error(f"Error updating calendar event: {error}")
            return None

    def delete_event(self, calendar_id: str, event_id: str) -> bool:
        """
        Delete a calendar event
        """
        if not self.service:
            logger.error("Calendar service not initialized")
            return False

        try:
            self.service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            logger.info(f"Event deleted: {event_id}")
            return True
        except HttpError as error:
            logger.error(f"Error deleting calendar event: {error}")
            return False
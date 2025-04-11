'''
Create a class AnalyticsTests(TestCase) that inherits from TestCase. This class will contain all the test cases for the analytics module.
There will be a setup method that will use the admin as the user and create a few rooms and bookings to be used in the test cases.
The methods will be test_total_bookings, test_peak_hours, test_status_breakdown, test_top_users, test_pending_bookings, test_active_bookings, test_most_booked_rooms, test_least_booked_rooms, test_utilization.
'''
# Create your tests here.

from django.test import TestCase
from django.urls import reverse
from rooms.models import Room
from bookings.models import Booking
from django.utils.timezone import now, timedelta
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from django.db.models import Count
from .serializers import CountStatSerializer, TimeSeriesStatSerializer, RoomUsageStatSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.middleware.csrf import get_token
from django.test.client import RequestFactory

class AnalyticsTests(TestCase):
    def setUp(self):
        # Create a user
        User = get_user_model()
        self.user = User.objects.create_superuser(email='admin@example.com', password='adminpass')
        self.client = APIClient()

        # Generate JWT tokens for the user
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)

        # Set the JWT token in the cookie
        self.client.cookies['plek-access'] = access_token

        # Generate a CSRF token using RequestFactory
        factory = RequestFactory()
        request = factory.get('/')  # Simulate a GET request
        csrf_token = get_token(request)

        # Set the CSRF token in the headers
        self.client.credentials(HTTP_X_CSRFTOKEN=csrf_token)

        # Create rooms
        self.room1 = Room.objects.create(
            name="Room 1", 
            capacity=10, 
            description="Test Room 1", 
            building="Building A", 
            amenities=["Projector", "Whiteboard"]
        )
        self.room2 = Room.objects.create(
            name="Room 2", 
            capacity=20, 
            description="Test Room 2", 
            building="Building B", 
            amenities=["Projector", "Whiteboard", "Sound System"]
        )

        # Create bookings
        now_time = now()
        self.booking1 = Booking.objects.create(
            room=self.room1,
            user=self.user,
            start_time=now_time + timedelta(days=1),
            end_time=now_time + timedelta(days=1, hours=2),
            status="approved",
            purpose="Meeting",
            participants="User 1, User 2",
            cancellation_reason=None
        )
        self.booking2 = Booking.objects.create(
            room=self.room1,
            user=self.user,
            start_time=now_time + timedelta(days=2),
            end_time=now_time + timedelta(days=2, hours=3),
            status="pending",
            purpose="Conference",
            participants="User 3, User 4",
            cancellation_reason=None
        )
        self.booking3 = Booking.objects.create(
            room=self.room2,
            user=self.user,
            start_time=now_time + timedelta(days=3),
            end_time=now_time + timedelta(days=3, hours=4),
            status="approved",
            purpose="Workshop",
            participants="User 5, User 6",
            cancellation_reason=None
        )

    def test_total_bookings(self):
        response = self.client.get('/api/analytics/bookings/?stat_type=totals')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the correct number of total bookings
        self.assertEqual(len(response.data), 3)

    def test_peak_hours(self):
        response = self.client.get('/api/analytics/bookings/?stat_type=peak_hours')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the expected keys
        self.assertIn('label', response.data[0])
        self.assertIn('value', response.data[0])

    def test_status_breakdown(self):
        response = self.client.get('/api/analytics/bookings/?stat_type=status')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the correct status breakdown
        self.assertTrue(any(stat['status'] == "approved" for stat in response.data))

    def test_top_users(self):
        response = self.client.get('/api/analytics/bookings/?stat_type=top_users')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the correct user data
        self.assertEqual(response.data[0]['label'], self.user.email)  # Assuming email is used instead of username
        self.assertIn('label', response.data[0])
        self.assertIn('value', response.data[0])

    def test_pending_bookings(self):
        response = self.client.get('/api/analytics/bookings/?stat_type=pending')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the expected room name and count
        self.assertTrue(any(stat['label'] == self.room1.name and stat['value'] == 1 for stat in response.data))

    def test_active_bookings(self):
        response = self.client.get('/api/analytics/bookings/?stat_type=active')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the active bookings
        self.assertIn('active_bookings', response.data)

    def test_most_booked_rooms(self):
        response = self.client.get('/api/analytics/rooms/?stat_type=most_booked')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the most booked room
        self.assertEqual(response.data[0]['name'], self.room1.name)
        self.assertIn('name', response.data[0])
        self.assertIn('count', response.data[0])

    def test_least_booked_rooms(self):
        response = self.client.get('/api/analytics/rooms/?stat_type=least_booked')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the least booked room
        self.assertEqual(response.data[0]['name'], self.room2.name)
        self.assertIn('name', response.data[0])
        self.assertIn('count', response.data[0])

    def test_utilization(self):
        response = self.client.get('/api/analytics/rooms/?stat_type=utilization')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if the response contains the utilization data
        self.assertIn('name', response.data[0])
        self.assertIn('usage_hours', response.data[0])
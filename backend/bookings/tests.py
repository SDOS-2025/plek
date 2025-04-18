from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.utils.timezone import make_aware
from settings.models import InstitutePolicy
from rooms.models import Room, Department, Floor, Building  # Add Building import
from .models import Booking
from django.contrib.auth.models import Permission

User = get_user_model()

class BookingTests(TestCase):
    def setUp(self):
    # Create a superuser
        self.user = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        
        # Authenticate the superuser
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create institute policy
        self.policy = InstitutePolicy.objects.create(
            booking_opening_days=30,
            max_booking_duration_hours=4,
            working_hours_start="08:00",
            working_hours_end="19:00"
        )

        # Create test building
        self.building = Building.objects.create(
            name="Test Building",
            description="Test Building Description"
        )

        # Create test department
        self.department = Department.objects.create(
            name="Test Department",
            description="Test Department Description"
        )

        # Create test floor
        self.floor = Floor.objects.create(
            name='Test Floor',
            number=1,
            building=self.building
        )
        
        # Create test room (only once)
        self.room = Room.objects.create(
            name='Test Room',
            capacity=10,
            floor=self.floor,
            building=self.building,
            available=True
        )
        self.room.departments.add(self.department) 



    def test_working_hours_validation(self):
        # Try booking outside working hours
        response = self.client.post('/bookings/create/', {
            'room': self.room.id,
            'start_time': make_aware(datetime.now().replace(hour=7, minute=0)),
            'end_time': make_aware(datetime.now().replace(hour=8, minute=0)),
            'purpose': 'Test booking'
        })
        print(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('time', response.data)

    def test_booking_duration_validation(self):
        # Try booking for longer than allowed
        start_time = make_aware(datetime.now().replace(hour=9, minute=0))
        response = self.client.post('/bookings/create/', {
            'room': self.room.id,
            'start_time': start_time,
            'end_time': start_time + timedelta(hours=5),
            'purpose': 'Test booking'
        })
        print(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('duration', response.data)

    def test_advance_booking_validation(self):
        # Try booking beyond allowed days
        start_time = make_aware(datetime.now() + timedelta(days=31))
        response = self.client.post('/bookings/create/', {
            'room': self.room.id,
            'start_time': start_time,
            'end_time': start_time + timedelta(hours=1),
            'purpose': 'Test booking'
        })
        print(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('start_time', response.data)

    def test_backdated_booking_validation(self):
        # Try backdated booking when not allowed
        start_time = make_aware(datetime.now() - timedelta(hours=1))
        response = self.client.post('/bookings/create/', {
            'room': self.room.id,
            'start_time': start_time,
            'end_time': start_time + timedelta(hours=1),
            'purpose': 'Test booking'
        })
        print(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('start_time', response.data)

    def test_valid_booking(self):
        # Test a valid booking within all policy constraints
        start_time = make_aware(datetime.now().replace(hour=10, minute=0) + timedelta(days=1))
        response = self.client.post('/bookings/create/', {
            'room': self.room.id,
            'start_time': start_time,
            'end_time': start_time + timedelta(hours=2),
            'purpose': 'Test booking'
        })
        print(response.data)
        self.assertEqual(response.status_code, 201)
        


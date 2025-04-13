from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import InstitutePolicy

class InstitutePolicyViewTests(APITestCase):
    def setUp(self):
        # Create a test admin user
        User = get_user_model()
        self.admin_user = User.objects.create_superuser(email="admin@example.com", password="adminpass123")
        self.client.force_authenticate(user=self.admin_user)

        # Create a test policy
        self.policy = InstitutePolicy.objects.create(
            name="Test Policy",
            description="This is a test policy.",
            is_active=True,
            booking_opening_days=30,
            max_booking_duration_hours=4,
            min_gap_between_bookings_minutes=15,
            working_hours_start="08:00",
            working_hours_end="19:00",
            allow_backdated_bookings=False,
            enable_auto_approval=False,
            approval_window_hours=48,
        )

    def test_get_policy(self):
        url = reverse("institute-policy")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.policy.name)
        self.assertEqual(response.data["description"], self.policy.description)
        self.assertTrue(response.data["is_active"])
        self.assertEqual(response.data["booking_opening_days"], 30)
        self.assertEqual(response.data["max_booking_duration_hours"], 4)
        self.assertEqual(response.data["min_gap_between_bookings_minutes"], 15)
        self.assertEqual(response.data["working_hours_start"], "08:00:00")  # Updated to match serialized format
        self.assertEqual(response.data["working_hours_end"], "19:00:00")  # Updated to match serialized format
        self.assertFalse(response.data["allow_backdated_bookings"])
        self.assertFalse(response.data["enable_auto_approval"])
        self.assertEqual(response.data["approval_window_hours"], 48)

    def test_patch_policy(self):
        url = reverse("institute-policy")
        data = {
            "name": "Updated Policy",
            "description": "This is an updated policy.",
            "is_active": False,
            "booking_opening_days": 60,
            "max_booking_duration_hours": 6,
            "min_gap_between_bookings_minutes": 30,
            "working_hours_start": "09:00",
            "working_hours_end": "18:00",
            "allow_backdated_bookings": True,
            "enable_auto_approval": True,
            "approval_window_hours": 24,
        }
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.policy.refresh_from_db()
        self.assertEqual(self.policy.name, "Updated Policy")
        self.assertEqual(self.policy.description, "This is an updated policy.")
        self.assertFalse(self.policy.is_active)
        self.assertEqual(self.policy.booking_opening_days, 60)
        self.assertEqual(self.policy.max_booking_duration_hours, 6)
        self.assertEqual(self.policy.min_gap_between_bookings_minutes, 30)
        self.assertEqual(self.policy.working_hours_start.strftime("%H:%M"), "09:00")
        self.assertEqual(self.policy.working_hours_end.strftime("%H:%M"), "18:00")
        self.assertTrue(self.policy.allow_backdated_bookings)
        self.assertTrue(self.policy.enable_auto_approval)
        self.assertEqual(self.policy.approval_window_hours, 24)

    def test_non_admin_access(self):
        # Create a non-admin user
        User = get_user_model()
        non_admin_user = User.objects.create_user(email="testuser@example.com", password="testpass123")  # Added email
        self.client.force_authenticate(user=non_admin_user)

        url = reverse("institute-policy")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.patch(url, {"name": "Unauthorized Update"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

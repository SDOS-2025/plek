from unittest.mock import patch

from django.test import TestCase
from rest_framework import status

from .tests import AnalyticsTests

# filepath: c:\Users\Rishi\Desktop\plek\backend\analytics\test_tests.py


class AnalyticsTestsWrapper(TestCase):
    def setUp(self):
        self.analytics_tests = AnalyticsTests()
        self.analytics_tests.setUp()

    @patch("rest_framework.test.APIClient.get")
    def test_test_total_bookings(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = [{"date": "2023-10-01", "total_bookings": 3}]
        self.analytics_tests.test_total_bookings()

    @patch("rest_framework.test.APIClient.get")
    def test_test_peak_hours(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = [{"label": "10:00", "value": 5}]
        self.analytics_tests.test_peak_hours()

    @patch("rest_framework.test.APIClient.get")
    def test_test_status_breakdown(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = [
            {"label": "approved", "value": 2},
            {"label": "pending", "value": 1},
        ]
        self.analytics_tests.test_status_breakdown()

    @patch("rest_framework.test.APIClient.get")
    def test_test_top_users(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = [{"label": "admin", "value": 3}]
        self.analytics_tests.test_top_users()

    @patch("rest_framework.test.APIClient.get")
    def test_test_pending_bookings(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = {"pending_bookings": 1}
        self.analytics_tests.test_pending_bookings()

    @patch("rest_framework.test.APIClient.get")
    def test_test_active_bookings(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = {"active_bookings": 1}
        self.analytics_tests.test_active_bookings()

    @patch("rest_framework.test.APIClient.get")
    def test_test_most_booked_rooms(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = [{"label": "Room 1", "value": 2}]
        self.analytics_tests.test_most_booked_rooms()

    @patch("rest_framework.test.APIClient.get")
    def test_test_utilization(self, mock_get):
        mock_get.return_value.status_code = status.HTTP_200_OK
        mock_get.return_value.data = [{"room_name": "Room 1", "usage_hours": 5}]
        self.analytics_tests.test_utilization()

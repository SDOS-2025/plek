from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Amenity, Building, Room


class AmenitiesViewTests(APITestCase):
    def setUp(self):
        # Create a test user
        User = get_user_model()
        self.user = User.objects.create_user(email="testuser@example.com", password="testpass123")
        self.client.force_authenticate(user=self.user)

        # Create test building
        self.building = Building.objects.create(
            name="Test Building", description="Test Building Description"
        )

        # Create test amenity
        self.amenity = Amenity.objects.create(name="Projector", description="HD Projector")

        # Create test rooms
        self.room1 = Room.objects.create(name="Test Room 1", building=self.building, capacity=50)
        self.room1.amenities.set([self.amenity])

        self.room2 = Room.objects.create(name="Test Room 2", building=self.building, capacity=30)
        self.room2.amenities.set([self.amenity])

    def test_list_amenities(self):
        url = reverse("list_amenities")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_amenity(self):
        url = reverse("add_amenity")
        data = {"name": "Whiteboard", "description": "Large whiteboard"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Amenity.objects.count(), 2)

    def test_update_amenity(self):
        url = reverse("edit_amenity", args=[self.amenity.id])
        data = {"name": "Updated Projector", "description": "Updated description"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.amenity.refresh_from_db()
        self.assertEqual(self.amenity.name, "Updated Projector")

    def test_delete_amenity(self):
        url = reverse("delete_amenity", args=[self.amenity.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Amenity.objects.count(), 0)

    def test_get_room_amenities(self):
        url = reverse("amenity_rooms", args=[self.amenity.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["name"], self.room1.name)
        self.assertEqual(response.data[1]["name"], self.room2.name)


class BuildingsViewTests(APITestCase):
    def setUp(self):
        # Create a test user
        User = get_user_model()
        self.user = User.objects.create_user(email="testuser@example.com", password="testpass123")
        self.client.force_authenticate(user=self.user)

        # Create test building
        self.building = Building.objects.create(
            name="Test Building", description="Test Building Description"
        )

        # Create test room in the building
        self.room = Room.objects.create(name="Test Room", building=self.building, capacity=50)

    def test_list_buildings(self):
        url = reverse("list_buildings")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_building(self):
        url = reverse("add_building")
        data = {"name": "New Building", "description": "New Building Description"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Building.objects.count(), 2)

    def test_update_building(self):
        url = reverse("edit_building", args=[self.building.id])
        data = {"name": "Updated Building", "description": "Updated description"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.building.refresh_from_db()
        self.assertEqual(self.building.name, "Updated Building")

    def test_delete_building(self):
        url = reverse("delete_building", args=[self.building.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Building.objects.count(), 0)

    def test_get_building_rooms(self):
        url = reverse("building_rooms", args=[self.building.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], self.room.name)

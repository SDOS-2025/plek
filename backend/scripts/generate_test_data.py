import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone
import random

# Setup Django environment
sys.path.append('d:/plek/plek/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import models
from django.contrib.auth import get_user_model
from rooms.models import Room, Building, Amenity, Floor
from bookings.models import Booking

User = get_user_model()

def create_test_data():
    print("Creating test data for analytics using provided room information...")
    
    # Create admin user if it doesn't exist
    admin_user, created = User.objects.get_or_create(
        email="admin@example.com",
        defaults={
            "is_staff": True,
            "is_superuser": True
        }
    )
    if created:
        admin_user.set_password("adminpass")
        admin_user.save()
        print("Created admin user: admin@example.com / adminpass")
    else:
        print("Admin user already exists")
    
    # Create regular users
    users = []
    for i in range(1, 6):
        user, created = User.objects.get_or_create(
            email=f"user{i}@example.com",
            defaults={
                "first_name": f"User{i}",
                "last_name": f"Test"
            }
        )
        if created:
            user.set_password(f"userpass{i}")
            user.save()
            print(f"Created regular user: user{i}@example.com / userpass{i}")
        users.append(user)
    
    # Create rooms based on provided information
    room_data = [
        {"name": "C01", "building": "Old Academic Building", "floor": "Ground Floor", "capacity": 30, "room_type": "Classroom"},
        {"name": "C02", "building": "Old Academic Building", "floor": "Ground Floor", "capacity": 30, "room_type": "Classroom"},
        {"name": "C03", "building": "Old Academic Building", "floor": "Ground Floor", "capacity": 30, "room_type": "Classroom"},
        {"name": "C11", "building": "Old Academic Building", "floor": "1st Floor", "capacity": 40, "room_type": "Classroom"},
        {"name": "C12", "building": "Old Academic Building", "floor": "1st Floor", "capacity": 40, "room_type": "Classroom"},
        {"name": "C13", "building": "Old Academic Building", "floor": "1st Floor", "capacity": 40, "room_type": "Classroom"},
        {"name": "C21", "building": "Old Academic Building", "floor": "2nd Floor", "capacity": 50, "room_type": "Classroom"},
        {"name": "C22", "building": "Old Academic Building", "floor": "2nd Floor", "capacity": 50, "room_type": "Classroom"},
        {"name": "C23", "building": "Old Academic Building", "floor": "2nd Floor", "capacity": 50, "room_type": "Classroom"},
        {"name": "C24", "building": "Old Academic Building", "floor": "2nd Floor", "capacity": 50, "room_type": "Classroom"},
        {"name": "A006", "building": "R&D Building", "floor": "Ground Floor", "capacity": 20, "room_type": "Classroom"},
        {"name": "A007", "building": "R&D Building", "floor": "Ground Floor", "capacity": 20, "room_type": "Classroom"},
        {"name": "B001", "building": "R&D Building", "floor": "Ground Floor", "capacity": 25, "room_type": "Classroom"},
        {"name": "B002", "building": "R&D Building", "floor": "Ground Floor", "capacity": 25, "room_type": "Classroom"},
        {"name": "B003", "building": "R&D Building", "floor": "Ground Floor", "capacity": 25, "room_type": "Classroom"},
        {"name": "A102", "building": "R&D Building", "floor": "1st Floor", "capacity": 30, "room_type": "Classroom"},
        {"name": "A106", "building": "R&D Building", "floor": "1st Floor", "capacity": 30, "room_type": "Classroom"},
        {"name": "B105", "building": "R&D Building", "floor": "1st Floor", "capacity": 35, "room_type": "Classroom"},
        {"name": "C101", "building": "Lecture Hall Complex", "floor": "1st Floor", "capacity": 100, "room_type": "Classroom"},
        {"name": "C102", "building": "Lecture Hall Complex", "floor": "1st Floor", "capacity": 100, "room_type": "Classroom"},
        {"name": "C201", "building": "Lecture Hall Complex", "floor": "2nd Floor", "capacity": 100, "room_type": "Classroom"},
        {"name": "C208", "building": "Lecture Hall Complex", "floor": "2nd Floor", "capacity": 100, "room_type": "Classroom"},
        {"name": "C209", "building": "Lecture Hall Complex", "floor": "2nd Floor", "capacity": 100, "room_type": "Classroom"},
        {"name": "L1", "building": "Library Building", "floor": "1st Floor", "capacity": 20, "room_type": "Classroom"},
        {"name": "L2", "building": "Library Building", "floor": "2nd Floor", "capacity": 20, "room_type": "Classroom"},
        {"name": "L3", "building": "Library Building", "floor": "3rd Floor", "capacity": 20, "room_type": "Classroom"},
        {"name": "301", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
        {"name": "302", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
        {"name": "303", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
        {"name": "315", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
        {"name": "316", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
        {"name": "320", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
        {"name": "321", "building": "Lecture Hall Complex", "floor": "3rd Floor", "capacity": 50, "room_type": "Lab"},
    ]
    
    # Create building objects first
    buildings = {}
    for data in room_data:
        building_name = data["building"]
        if building_name not in buildings:
            building, _ = Building.objects.get_or_create(name=building_name)
            buildings[building_name] = building
    
    # Create floors for each building
    floors = {}
    for data in room_data:
        building = buildings[data["building"]]
        floor_name = data["floor"]
        
        # Convert floor name to number
        if floor_name == "Ground Floor":
            floor_num = 0
        elif "Basement" in floor_name:
            floor_num = -1
        else:
            # Extract number from "1st Floor", "2nd Floor", etc.
            floor_num = int(''.join(filter(str.isdigit, floor_name)))
        
        key = f"{building.name}_{floor_name}"
        if key not in floors:
            floor, _ = Floor.objects.get_or_create(
                building=building,
                number=floor_num,
                defaults={"name": floor_name}
            )
            floors[key] = floor
    
    # Create amenities
    amenity_names = ["Projector", "Whiteboard", "Air Conditioning"]
    amenities = []
    for name in amenity_names:
        amenity, _ = Amenity.objects.get_or_create(name=name)
        amenities.append(amenity)
    
    rooms = []
    for data in room_data:
        building = buildings[data["building"]]
        floor = floors[f"{building.name}_{data['floor']}"]
        # Create or get the room
        room, created = Room.objects.get_or_create(
            name=data["name"],
            defaults={
                "building": building,
                "floor": floor,
                "capacity": data["capacity"],
                "available": True
            }
        )
        
        # Add amenities to the room
        for amenity in amenities:
            room.amenities.add(amenity)
        
        if created:
            print(f"Created room: {room.name} in {room.building}")
        rooms.append(room)
    
    # Create bookings between April 20, 2025 and May 10, 2025
    statuses = ["pending", "approved", "rejected", "cancelled", "completed"]
    purposes = ["Lecture", "Meeting", "Study Group", "Workshop", "Exam", "Seminar", "Lab Session", "Project Work"]
    
    # Define the date range for bookings
    start_date = datetime(2025, 4, 20, tzinfo=timezone.get_current_timezone())
    end_date = datetime(2025, 5, 10, tzinfo=timezone.get_current_timezone())
    current_date = datetime(2025, 5, 2, tzinfo=timezone.get_current_timezone())  # Current date for status logic
    
    # Calculate number of days in the range
    days_in_range = (end_date - start_date).days
    
    # Generate bookings within the date range
    booking_count = 0
    # Generate about 200 bookings in this period (about 10 per day)
    total_bookings = 200
    
    for _ in range(total_bookings):
        # Random date within the range
        random_day = random.randint(0, days_in_range)
        booking_date = start_date + timedelta(days=random_day)
        
        # Random time between 8 AM and 8 PM
        hour = random.randint(8, 19)
        booking_date = booking_date.replace(hour=hour, minute=0, second=0, microsecond=0)
        
        # Duration between 1-3 hours
        duration = random.randint(1, 3)
        end_time = booking_date + timedelta(hours=duration)
        
        # Randomly select user and room
        user = random.choice(users + [admin_user])
        room = random.choice(rooms)
        
        # Weight status probability based on time
        if booking_date > current_date:
            # Future bookings more likely to be pending or approved
            status_weights = [0.6, 0.4, 0, 0, 0]  # pending, approved, rejected, cancelled, completed
        else:
            # Past bookings (before current date) more likely to be completed
            status_weights = [0, 0.3, 0.1, 0.1, 0.5]  # pending, approved, rejected, cancelled, completed
            
        status = random.choices(statuses, weights=status_weights)[0]
        
        # Create booking
        cancellation_reason = None
        if status == "cancelled":
            cancellation_reason = random.choice([
                "Schedule conflict", 
                "No longer needed", 
                "Change of venue", 
                "Event postponed"
            ])
            
        purpose = random.choice(purposes)
        # Generate a random number of attendees based on room capacity
        num_attendees = random.randint(5, room.capacity)
        
        booking = Booking.objects.create(
            room=room,
            user=user,
            start_time=booking_date,
            end_time=end_time,
            status=status,
            purpose=purpose,
            participants=num_attendees,  # Store the actual number instead of a string
            cancellation_reason=cancellation_reason
        )
        
        # Set created_at to a reasonable time before the booking
        days_before = min(random.randint(1, 7), (booking_date - start_date).days)
        booking.created_at = booking_date - timedelta(days=days_before)
        booking.save(update_fields=['created_at'])
        
        booking_count += 1
            
    print(f"Created {booking_count} bookings between April 20, 2025 and May 10, 2025 across {len(rooms)} rooms")
    print("Test data creation completed!")

if __name__ == "__main__":
    create_test_data()
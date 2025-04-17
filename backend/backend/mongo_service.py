from datetime import datetime

from backend.settings import mongo_db

# Logs Collection
logs_collection = mongo_db["logs"]


def add_log(event, user_id, room_id, details):
    log_entry = {
        "event": event,
        "user_id": user_id,
        "room_id": room_id,
        "timestamp": datetime.utcnow(),
        "details": details,
    }
    logs_collection.insert_one(log_entry)


# Notifications Collection
notifications_collection = mongo_db["notifications"]


def add_notification(user_id, message):
    notification = {"user_id": user_id, "message": message, "timestamp": datetime.utcnow()}
    notifications_collection.insert_one(notification)


# Amenities Collection
amenities_collection = mongo_db["amenities"]


def get_amenities(room_id):
    room = amenities_collection.find_one({"room_id": room_id})
    return room["amenities"] if room else []

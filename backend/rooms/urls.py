from django.urls import path

from .views import (
    AmenityManageView,
    BuildingManageView,
    DepartmentManageView,
    FloorManageView,
    RoomListView,
    RoomManageView,
)

urlpatterns = [
    # Rooms
    path("rooms/", RoomListView.as_view(), name="list_rooms"),
    path("rooms/create/", RoomManageView.as_view(), name="create_room"),
    path("rooms/<int:room_id>/", RoomManageView.as_view(), name="manage_room"),
    # Buildings
    path("buildings/", BuildingManageView.as_view(), name="list_buildings"),
    path("buildings/create/", BuildingManageView.as_view(), name="create_building"),
    path(
        "buildings/<int:building_id>/",
        BuildingManageView.as_view(),
        name="manage_building",
    ),
    # Amenities
    path("amenities/", AmenityManageView.as_view(), name="list_amenities"),
    path("amenities/create/", AmenityManageView.as_view(), name="create_amenity"),
    path(
        "amenities/<int:amenity_id>/",
        AmenityManageView.as_view(),
        name="manage_amenity",
    ),
    # Floors
    path("floors/", FloorManageView.as_view(), name="list_floors"),
    path("floors/create/", FloorManageView.as_view(), name="create_floor"),
    path("floors/<int:floor_id>/", FloorManageView.as_view(), name="manage_floor"),
    # Building floors relation
    path(
        "buildings/<int:building_id>/floors/",
        FloorManageView.as_view(),
        name="building_floors",
    ),
    # Departments - New endpoints for department management
    path("departments/", DepartmentManageView.as_view(), name="list_departments"),
    path("departments/create/", DepartmentManageView.as_view(), name="create_department"),
    path(
        "departments/<int:department_id>/",
        DepartmentManageView.as_view(),
        name="manage_department",
    ),
    # Room departments relation
    path(
        "rooms/<int:room_id>/departments/",
        DepartmentManageView.as_view(),
        name="room_departments",
    ),
]

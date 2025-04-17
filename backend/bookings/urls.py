from django.urls import path

from .views import (
    AllBookingsView,
    BookingApprovalView,
    BookingCreateView,
    BookingManageView,
    FloorDeptBookingView,
    OverrideBookingView,
)

urlpatterns = [
    # User's own bookings management
    path("bookings/", BookingManageView.as_view(), name="user-bookings"),
    path("bookings/<int:booking_id>/", BookingManageView.as_view(), name="manage-booking"),
    path("bookings/create/", BookingCreateView.as_view(), name="create-booking"),
    # Coordinator views
    path(
        "bookings/floor-dept/",
        FloorDeptBookingView.as_view(),
        name="floor-dept-bookings",
    ),
    path(
        "bookings/approval/<int:booking_id>/",
        BookingApprovalView.as_view(),
        name="booking-approval",
    ),
    # Admin views
    path("bookings/all/", AllBookingsView.as_view(), name="all-bookings"),
    path(
        "bookings/override/<int:booking_id>/",
        OverrideBookingView.as_view(),
        name="override-booking",
    ),
]

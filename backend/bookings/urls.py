from django.urls import path
from .views import BookingView, BookingListView

urlpatterns = [
    path('bookings/', BookingListView.as_view(), name='booking'),
    path('bookings/<int:id>/', BookingView.as_view(), name='retrieve-booking'),
    path('book/add/', BookingView.as_view(), name='add-booking'),
    path('book/delete/<int:id>/', BookingView.as_view(), name='delete-booking'),
    path('book/update/<int:id>/', BookingView.as_view(), name='update-booking'),
]

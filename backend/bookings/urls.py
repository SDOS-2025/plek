from django.urls import path
from .views import book_room

urlpatterns = [
    path('book/', book_room, name='book-room'),
]

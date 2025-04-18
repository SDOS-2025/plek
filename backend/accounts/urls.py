# accounts/urls.py
from django.urls import path

from .views import (
    UserDetailView,
    UserListView,
    UserProfileView,
    UserRoleManagementView,
    CheckSocialAccountLinkageView,
)

urlpatterns = [
    # Admin user management
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path(
        "users/<int:user_id>/role/",
        UserRoleManagementView.as_view(),
        name="user-role-management",
    ),
    path(
        "users/<int:user_id>/social-accounts/",
        CheckSocialAccountLinkageView.as_view(),
        name="check-social-account-linkage",
    ),
    path(
        "users/social-accounts/",
        CheckSocialAccountLinkageView.as_view(),
        name="check-own-social-account-linkage",
    ),
    # User profile management
    path("profile/", UserProfileView.as_view(), name="user-profile"),
]

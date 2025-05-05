# accounts/urls.py
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import views as auth_views
from .views import (
    UserDetailView,
    UserListView,
    UserProfileView,
    UserRoleManagementView,
    CheckSocialAccountLinkageView,
    RequestPasswordResetOTPView,
    VerifyOTPAndResetPasswordView,
    CustomPasswordResetView,
    CustomPasswordResetConfirmView,
    ChangePasswordView,  # Import the new view
)

urlpatterns = [
    # User management
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path(
        "users/<int:user_id>/role/",
        UserRoleManagementView.as_view(),
        name="user-role-management",
    ),
    
    # User profile
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    
    # Social account checks
    path(
        "social/check/",
        CheckSocialAccountLinkageView.as_view(),
        name="check-social-linkage",
    ),
    path(
        "social/check/<int:user_id>/",
        CheckSocialAccountLinkageView.as_view(),
        name="check-user-social-linkage",
    ),
    
    # Password reset endpoints - these work with DRF
    path('password/reset/', 
        auth_views.PasswordResetView.as_view(
            html_email_template_name='registration/password_reset_email.html',
            subject_template_name='registration/password_reset_subject.txt',
            template_name='registration/password_reset_form.html'
        ), 
        name='password_reset'
    ),
    path('password/reset/done/', 
        auth_views.PasswordResetDoneView.as_view(), 
        name='password_reset_done'
    ),
    path('password/reset/confirm/<uidb64>/<token>/',  
        auth_views.PasswordResetConfirmView.as_view(
            success_url='/accounts/password/reset/complete/'
        ), 
        name='password_reset_confirm'
    ),
    path('password/reset/complete/', 
        auth_views.PasswordResetCompleteView.as_view(), 
        name='password_reset_complete'
    ),
    
    # OTP-based Password Reset
    path('password/reset-otp/', 
        RequestPasswordResetOTPView.as_view(), 
        name='password_reset_otp'
    ),
    path('password/reset-with-otp/', 
        VerifyOTPAndResetPasswordView.as_view(), 
        name='password_reset_with_otp'
    ),
    
    # Password change for authenticated users
    path('password/change/',
        ChangePasswordView.as_view(),
        name='password_change'
    ),
]

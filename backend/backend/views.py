"""
Core authentication views for Google OAuth integration.
"""

from .adapters import CustomGoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.views import OAuth2CallbackView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView
from django.http import HttpResponseRedirect
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


class GoogleLogin(SocialLoginView):
    """
    View for handling Google OAuth login via the custom adapter.

    This integrates with dj-rest-auth to provide JWT token auth
    for Google OAuth logins.
    """

    adapter_class = CustomGoogleOAuth2Adapter


class CustomOAuth2CallbackView(OAuth2CallbackView):
    """
    Custom callback view for OAuth2 authentication.
    
    Extends the default OAuth2CallbackView to set JWT cookies after successful authentication.
    """
    
    def dispatch(self, request, *args, **kwargs):
        # First run the original dispatch to complete the OAuth flow
        response = super().dispatch(request, *args, **kwargs)
        
        # If the user is now authenticated, set the JWT cookies
        if request.user.is_authenticated and isinstance(response, HttpResponseRedirect):
            # Generate JWT tokens
            refresh = RefreshToken.for_user(request.user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Set the cookies on the response
            response.set_cookie(
                settings.REST_AUTH["JWT_AUTH_COOKIE"],
                access_token,
                max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
                httponly=settings.REST_AUTH["JWT_AUTH_HTTPONLY"],
                samesite=settings.REST_AUTH["JWT_AUTH_SAMESITE"],
                secure=settings.REST_AUTH["JWT_AUTH_SECURE"],
            )
            
            response.set_cookie(
                settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE"],
                refresh_token,
                max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
                httponly=settings.REST_AUTH["JWT_AUTH_HTTPONLY"],
                samesite=settings.REST_AUTH["JWT_AUTH_SAMESITE"],
                secure=settings.REST_AUTH["JWT_AUTH_SECURE"],
            )
            
        return response

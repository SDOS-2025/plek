"""
Core authentication views for Google OAuth integration.
"""

from .adapters import CustomGoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView


class GoogleLogin(SocialLoginView):
    """
    View for handling Google OAuth login via the custom adapter.

    This integrates with dj-rest-auth to provide JWT token auth
    for Google OAuth logins.
    """

    adapter_class = CustomGoogleOAuth2Adapter

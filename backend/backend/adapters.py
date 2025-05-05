from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Error, OAuth2Client
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
import requests
from django.conf import settings
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken


class CustomGoogleOAuth2Adapter(GoogleOAuth2Adapter):
    """
    Custom adapter for Google OAuth2 authentication.

    This adapter extends the standard GoogleOAuth2Adapter to provide
    additional validation for ID tokens via Google's tokeninfo endpoint.
    """
    scope_delimiter = " "
    access_token_url = GoogleOAuth2Adapter.access_token_url
    authorize_url = GoogleOAuth2Adapter.authorize_url
    id_token_issuer = GoogleOAuth2Adapter.id_token_issuer
    
    def get_client(self, request, app):
        # Explicitly specify all the scopes we need, including calendar
        scope = " ".join([
            "profile", 
            "email",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
        ])
        
        callback_url = settings.CALLBACK_URL_BASE + "/accounts/google/login/callback/"
        
        client = OAuth2Client(
            self.request_token_url,
            app.client_id,
            app.secret,
            self.access_token_url,
            self.authorize_url,
            scope=scope,
            callback_url=callback_url
        )
        client.state = self.statelib.make_state(request)
        return client

    def complete_login(self, request, app, token, **kwargs):
        try:
            # Validate ID token via Google's tokeninfo endpoint
            id_token = token.token
            resp = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
            resp.raise_for_status()
            token_info = resp.json()

            # Verify audience matches client_id
            if token_info["aud"] != app.client_id:
                raise OAuth2Error(f"Invalid audience: {token_info['aud']}")

            # Ensure required fields are present
            if not token_info.get("email"):
                raise OAuth2Error("Email not provided in token info")

            # Create social login
            social_login = self.get_provider().sociallogin_from_response(
                request, token_info
            )
            social_login.token = token
            return social_login
        except requests.RequestException as e:
            raise OAuth2Error(f"Failed to validate ID token: {str(e)}")


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter that sets JWT tokens after successful OAuth login
    and redirects to the frontend with tokens.
    """
    
    def save_user(self, request, sociallogin, form=None):
        # First, save the user as normal
        user = super().save_user(request, sociallogin, form)
        
        # Store Google token for later use with Calendar API
        credentials = sociallogin.token
        if credentials:
            # Save Google OAuth token to user profile or another suitable place
            sociallogin.account.extra_data['access_token'] = credentials.token
            sociallogin.account.extra_data['refresh_token'] = credentials.token_secret
            sociallogin.account.save()
        
        return user
    
    def get_connect_redirect_url(self, request, socialaccount):
        """
        Custom redirect URL after connecting a social account
        """
        return self._get_redirect_with_token(request, socialaccount.user)
    
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        return user
    
    def _get_redirect_with_token(self, request, user):
        """
        Generate JWT tokens and add them to the redirect URL
        """
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Set cookies in the response
        response = redirect(settings.LOGIN_REDIRECT_URL)
        
        # Set the access token cookie
        response.set_cookie(
            settings.REST_AUTH["JWT_AUTH_COOKIE"],
            access_token,
            max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
            httponly=settings.REST_AUTH["JWT_AUTH_HTTPONLY"],
            samesite=settings.REST_AUTH["JWT_AUTH_SAMESITE"],
            secure=settings.REST_AUTH["JWT_AUTH_SECURE"],
        )
        
        # Set the refresh token cookie
        response.set_cookie(
            settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE"],
            refresh_token,
            max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
            httponly=settings.REST_AUTH["JWT_AUTH_HTTPONLY"],
            samesite=settings.REST_AUTH["JWT_AUTH_SAMESITE"],
            secure=settings.REST_AUTH["JWT_AUTH_SECURE"],
        )
        
        return response

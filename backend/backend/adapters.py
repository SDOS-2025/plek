from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
import requests
from django.conf import settings


class CustomGoogleOAuth2Adapter(GoogleOAuth2Adapter):
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

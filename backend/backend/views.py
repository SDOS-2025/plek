from .adapters import CustomGoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView


class GoogleLogin(SocialLoginView):
    adapter_class = CustomGoogleOAuth2Adapter

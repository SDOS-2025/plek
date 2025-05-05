from dj_rest_auth.views import PasswordResetConfirmView
from django.urls import path
from django.conf import settings
from rest_framework.response import Response
from dj_rest_auth.views import PasswordResetView
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.sites.models import Site
from django.template import loader

# Custom password reset view that uses the frontend reset URL
class CustomPasswordResetView(PasswordResetView):
    email_template_name = 'registration/password_reset_email.html'
    subject_template_name = 'registration/password_reset_subject.txt'
    
    def send_email_for_password_reset(self, request, email, html_email_template_name=None):
        """
        Override this method to completely control how the reset email is sent
        """
        context = {
            'email': email,
            'frontend_url': settings.FRONTEND_URL,
            'site_name': 'Plek',
            'domain': settings.FRONTEND_URL.replace('http://', '').replace('https://', ''),
            'protocol': 'http' if settings.FRONTEND_URL.startswith('http://') else 'https',
        }
        
        # Create request context - needed for the uid and token generation
        from django.contrib.auth.forms import PasswordResetForm
        reset_form = PasswordResetForm(data={'email': email})
        
        # Get the first user matching this email
        user = reset_form.get_users(email)[0]
        context['user'] = user
        
        # Add uid and token to context
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        context['uid'] = urlsafe_base64_encode(force_bytes(user.pk))
        context['token'] = default_token_generator.make_token(user)
        
        # Render the email using the template
        subject = loader.render_to_string(self.subject_template_name, context)
        subject = ''.join(subject.splitlines())  # Email subject must be single line
        
        email_message = loader.render_to_string(self.email_template_name, context)
        
        # Send the email
        user.email_user(subject, email_message, from_email=settings.DEFAULT_FROM_EMAIL)
        
        # Set current site in Site model to avoid example.com
        try:
            site = Site.objects.get(id=settings.SITE_ID)
            site.domain = settings.FRONTEND_URL.replace('http://', '').replace('https://', '')
            site.name = 'Plek'
            site.save()
        except Exception as e:
            print(f"Could not update site: {e}")
            
        return True
    
    # Override to ensure successful API response
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        # Directly call our custom email method with the validated email
        self.send_email_for_password_reset(request, email)
        
        # Return success message
        return Response({"detail": "Password reset email has been sent."})

urlpatterns = [
    # dj-rest-auth password reset endpoints
    path('password/reset/', CustomPasswordResetView.as_view(), name='rest_password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='rest_password_reset_confirm'),
]
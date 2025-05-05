import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponseRedirect
from django.urls import reverse
from allauth.socialaccount.models import SocialLogin, SocialToken, SocialAccount
from allauth.socialaccount.helpers import complete_social_login
from allauth.socialaccount.providers.oauth2.views import OAuth2CallbackView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client

from .permissions import (
    CanModerateUsers,
    CanPromoteOrDemote,
    CanViewUsers,
)
from .serializers import CustomUserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


def assign_role(user, role_name):
    """Assign a role to the user by adding them to a group."""
    try:
        group = Group.objects.get(name=role_name)
    except Group.DoesNotExist:
        return Response(
            {"error": "Role does not exist."}, status=status.HTTP_400_BAD_REQUEST
        )
    user.groups.add(group)


def get_tokens_for_user(user):
    """
    Generate JWT tokens (access and refresh) for a given user.
    """
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class UserListView(APIView):
    permission_classes = [CanViewUsers]

    def get(self, request):
        """List all users (for admins)"""
        users = User.objects.all()

        # Filter by query parameters if provided
        email = request.query_params.get("email")
        if email:
            users = users.filter(email__icontains=email)

        group = request.query_params.get("group")
        if group:
            users = users.filter(groups__name=group)

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            is_active_bool = is_active.lower() == "true"
            users = users.filter(is_active=is_active_bool)

        serializer = CustomUserSerializer(users, many=True)
        return Response(serializer.data)


class UserDetailView(APIView):
    permission_classes = [CanViewUsers]

    def get(self, request, user_id):
        """Get details of a specific user"""
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CustomUserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, user_id):
        """Update user details (for admins and moderators)"""
        # Check user's permissions or role
        user_groups = request.user.groups.values_list('name', flat=True)
        is_admin = ('Admin' in user_groups or 'SuperAdmin' in user_groups or 
                   request.user.is_staff or request.user.is_superuser)
        
        # Check if this is a coordinator assignment operation
        is_coordinator_assignment = (
            'managed_floors' in request.data or 
            'managed_departments' in request.data or 
            'managed_buildings' in request.data
        )
        
        # Allow the operation if user is admin and this is a coordinator assignment
        has_permission = (is_admin and is_coordinator_assignment) or request.user.has_perm("users.moderate_user")
        
        if not has_permission:
            return Response(
                {"error": "You don't have permission to modify users"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check object-level permission (skip for coordinator assignments by admins)
        if not is_coordinator_assignment or not is_admin:
            permission = CanModerateUsers()
            if not permission.has_object_permission(request, self, user):
                return Response(
                    {"error": "You cannot modify yourself or this specific user"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Filter out name fields that admins/superadmins shouldn't be able to change
        data = request.data.copy()
        if "first_name" in data:
            del data["first_name"]
        if "last_name" in data:
            del data["last_name"]

        serializer = CustomUserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"User {user.email} updated by {request.user.email}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        """Deactivate a user (soft delete)"""
        if not request.user.has_perm("users.moderate_user"):
            return Response(
                {"error": "You don't have permission to deactivate users"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check object-level permission
        permission = CanModerateUsers()
        if not permission.has_object_permission(request, self, user):
            return Response(
                {"error": "You cannot deactivate yourself"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Implement soft delete by setting is_active to False
        user.is_active = False
        user.save()
        logger.info(f"User {user.email} deactivated by {request.user.email}")
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserRoleManagementView(APIView):
    permission_classes = [CanPromoteOrDemote]

    def post(self, request, user_id):
        """Promote or demote a user to a different role"""
        action = request.data.get("action")
        if action not in ["promote", "demote"]:
            return Response(
                {"error": "Action must be either 'promote' or 'demote'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_group_name = request.data.get("group")
        if not target_group_name:
            return Response(
                {"error": "Group name must be provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check object-level permission
        permission = CanPromoteOrDemote()
        if not permission.has_object_permission(request, self, user):
            if action == "demote" and user.groups.filter(name="SuperAdmin").exists():
                superadmin_count = User.objects.filter(
                    groups__name="SuperAdmin", is_active=True
                ).count()
                if superadmin_count <= 1:
                    return Response(
                        {"error": "Cannot demote the last active SuperAdmin"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            return Response(
                {"error": "You cannot manage your own role"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get target group
        try:
            target_group = Group.objects.get(name=target_group_name)
        except Group.DoesNotExist:
            return Response(
                {"error": f"Group '{target_group_name}' does not exist"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clear existing group memberships and add new one
        user.groups.clear()
        user.groups.add(target_group)

        logger.info(
            f"User {user.email} {action}d to {target_group_name} by {request.user.email}"
        )
        return Response(
            {"status": f"User successfully {action}d to {target_group_name}"}
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user's profile"""
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user's profile"""
        # Users can update their name and profile picture
        allowed_fields = {"first_name", "last_name", "profile_picture"}
        
        # Handle both form data and JSON requests
        if request.content_type and 'multipart/form-data' in request.content_type:
            # For multipart form data (file uploads)
            data = request.data
        else:
            # For JSON data - filter only allowed fields
            data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        serializer = CustomUserSerializer(request.user, data=data, partial=True)
        if serializer.is_valid():
            updated_user = serializer.save()
            
            # Include profile picture URL in response if it exists
            response_data = serializer.data
            if updated_user.profile_picture:
                response_data['profile_picture'] = request.build_absolute_uri(updated_user.profile_picture.url)
            
            logger.info(f"User {request.user.email} updated their profile")
            return Response(response_data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleLoginCallbackView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(csrf_exempt)
    def get(self, request, *args, **kwargs):
        """
        Handle the OAuth callback from Google and return JWT tokens
        """
        logger.info("Google OAuth callback received")

        # Check if we have the code parameter
        code = request.GET.get("code")

        if not code:
            logger.error("No authorization code received from Google")
            return HttpResponseRedirect("http://localhost:3000/login?error=no_code")

        try:
            # Get the adapter for Google OAuth
            adapter = GoogleOAuth2Adapter(request)
            callback_url = request.build_absolute_uri()

            # Find the app from the database
            from allauth.socialaccount.models import SocialApp

            try:
                app = SocialApp.objects.get(provider="google")
                logger.info(f"Found Google app: {app.name}")
            except SocialApp.DoesNotExist:
                logger.error("Google OAuth app not found in the database")
                return HttpResponseRedirect(
                    "http://localhost:3000/login?error=google_app_not_found"
                )

            # Create client
            client = OAuth2Client(
                request,
                app.client_id,
                app.secret,
                adapter.access_token_url,
                callback_url,
                adapter.basic_auth,
            )

            # Get access token
            token = client.get_access_token(code)
            token_dict = {"access_token": token}

            # Complete login with received token
            login_data = adapter.complete_login(request, app, token_dict)
            social_login = SocialLogin(login=login_data)

            # Process the login
            user = None
            if social_login.is_existing:
                # Login the existing user
                user = social_login.account.user
                login(request, user)
                logger.info(f"Existing user logged in: {user.email}")
            else:
                # Check if a superuser exists with the same email
                email = social_login.account.extra_data.get("email")
                try:
                    user = User.objects.get(email=email, is_superuser=True)
                    # Link the social account to the superuser
                    social_account, created = SocialAccount.objects.get_or_create(
                        user=user,
                        provider="google",
                        defaults={"uid": social_login.account.uid},
                    )
                    if created:
                        logger.info(f"Linked Google account to superuser: {user.email}")
                except User.DoesNotExist:
                    # Create a new user if no matching superuser exists
                    user = social_login.connect(request)
                    logger.info(f"New social account connected to user: {user.email}")

            # Generate tokens for the user
            tokens = get_tokens_for_user(user)

            # Set the tokens in cookies and redirect
            redirect_url = f"http://localhost:3000/oauth-callback?success=true"
            response = HttpResponseRedirect(redirect_url)

            # Set the access token cookie
            response.set_cookie(
                "plek-access",
                tokens["access"],
                max_age=300,  # 5 minutes
                path="/",
                secure=False,  # Set to True in production with HTTPS
                httponly=True,
                samesite="Lax",
            )

            # Set the refresh token cookie
            response.set_cookie(
                "plek-refresh",
                tokens["refresh"],
                max_age=86400,  # 1 day
                path="/",
                secure=False,  # Set to True in production with HTTPS
                httponly=True,
                samesite="Lax",
            )

            # Store user data in localStorage via URL params
            user_data = {
                "firstName": user.first_name or "",
                "lastName": user.last_name or "",
                "email": user.email,
            }

            param_string = "&".join(
                [f"{key}={value}" for key, value in user_data.items()]
            )
            full_redirect_url = f"{redirect_url}&{param_string}"

            logger.info(f"Redirecting to: {full_redirect_url}")
            return HttpResponseRedirect(full_redirect_url)

        except Exception as e:
            logger.error(f"Error during OAuth callback: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())
            return HttpResponseRedirect(f"http://localhost:3000/login?error={str(e)}")


class CheckSocialAccountLinkageView(APIView):
    """
    API view to check if a specific user is linked to a social account.
    Can be used to verify if a superuser created via terminal is properly linked.
    """

    permission_classes = [IsAuthenticated, CanViewUsers]

    def get(self, request, user_id=None):
        """Check if a user is linked to a social account"""
        try:
            # If user_id is provided, check that specific user
            # Otherwise check the currently authenticated user
            if user_id:
                user = User.objects.get(id=user_id)
            else:
                user = request.user

            # Check for social accounts linked to this user
            social_accounts = SocialAccount.objects.filter(user=user)

            # Prepare the response data
            result = {
                "user_id": user.id,
                "email": user.email,
                "is_superuser": user.is_superuser,
                "is_linked": social_accounts.exists(),
                "accounts": [],
            }

            # Add details for each linked account
            for account in social_accounts:
                result["accounts"].append(
                    {
                        "provider": account.provider,
                        "uid": account.uid,
                        "date_joined": account.date_joined.isoformat(),
                        "last_login": (
                            account.last_login.isoformat()
                            if account.last_login
                            else None
                        ),
                    }
                )

            logger.info(
                f"Social account check for user {user.email}: {result['is_linked']}"
            )
            return Response(result)

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

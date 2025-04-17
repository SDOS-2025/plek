import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
        return Response({"error": "Role does not exist."}, status=status.HTTP_400_BAD_REQUEST)
    user.groups.add(group)


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
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CustomUserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, user_id):
        """Update user details (for admins and moderators)"""
        if not request.user.has_perm("users.moderate_user"):
            return Response(
                {"error": "You don't have permission to modify users"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check object-level permission
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
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

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
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

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

        logger.info(f"User {user.email} {action}d to {target_group_name} by {request.user.email}")
        return Response({"status": f"User successfully {action}d to {target_group_name}"})


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user's profile"""
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user's profile"""
        # Limited fields users can update about themselves
        allowed_fields = {"first_name", "last_name"}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        serializer = CustomUserSerializer(request.user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"User {request.user.email} updated their profile")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

User = get_user_model()


def assign_role(user, role_name):
    """Assign a role to the user by adding them to a group."""
    try:
        group = Group.objects.get(name=role_name)
    except Group.DoesNotExist:
        return Response(
            {"error": "Role does not exist."}, status=status.HTTP_400_BAD_REQUEST
        )
    user.groups.add(group)

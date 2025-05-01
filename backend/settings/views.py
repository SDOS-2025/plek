import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import CanManageInstitutePolicies

from .models import InstitutePolicy
from .serializers import InstitutePolicySerializer

logger = logging.getLogger(__name__)


class InstitutePolicyView(APIView):
    permission_classes = [CanManageInstitutePolicies]  # or use IsSuperAdmin

    def get(self, request):
        policy = InstitutePolicy.objects.first()
        if not policy:
            # Create the singleton if it doesn't exist yet
            policy = InstitutePolicy.objects.create()
            logger.info("Default institute policy created")

        serializer = InstitutePolicySerializer(policy)
        return Response(serializer.data)

    def post(self, request):
        # Always get or create the singleton instance
        policy, created = InstitutePolicy.objects.get_or_create(pk=1)

        serializer = InstitutePolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            action = "created" if created else "updated"
            logger.info(f"Institute policy {action} by user {request.user.email}")
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicInstitutePolicyView(APIView):
    """Public endpoint for reading institute policies without edit permissions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        policy = InstitutePolicy.objects.first()
        if not policy:
            # Create the singleton if it doesn't exist yet
            policy = InstitutePolicy.objects.create()
            logger.info("Default institute policy created")

        serializer = InstitutePolicySerializer(policy)
        return Response(serializer.data)

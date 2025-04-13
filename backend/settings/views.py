from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from .models import InstitutePolicy
from .serializers import InstitutePolicySerializer

class InstitutePolicyView(APIView):
    permission_classes = [IsAdminUser]  # or use IsSuperAdmin

    def get(self, request):
        policy, _ = InstitutePolicy.objects.get_or_create(pk=1)
        serializer = InstitutePolicySerializer(policy)
        return Response(serializer.data)

    def patch(self, request):
        policy, _ = InstitutePolicy.objects.get_or_create(pk=1)
        serializer = InstitutePolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

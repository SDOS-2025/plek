from django.shortcuts import render
from rest_framework import viewsets
from .serializers import *
from .models import *
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status

class AccountView(APIView):   
    def post(self, request):
        serializer = AccountSerializer(data=request.data)
        if serializer.is_valid():
            # Hash password before saving
            account = serializer.save()
            account.set_password(serializer.validated_data['password']) # set password hashes before saving
            account.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        accounts = Account.objects.all()
        serializer = AccountSerializer(accounts, many=True)
        return Response(serializer.data)
    
    
    




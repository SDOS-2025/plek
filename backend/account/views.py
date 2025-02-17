from django.shortcuts import render

from rest_framework import viewsets

from .serializers import AccountSerializer

from .models import Account

class AccountView(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    queryset = Account.objects.all()

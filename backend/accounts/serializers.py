# accounts/serializers.py
from dj_rest_auth.registration.serializers import (
    RegisterSerializer as DefaultRegisterSerializer,
)
from dj_rest_auth.serializers import LoginSerializer as DefaultLoginSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from rest_framework import serializers

from rooms.models import Department, Floor, Building

from .models import CustomUser


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["name"]


class CustomUserSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    managed_buildings = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Building.objects.all(),
        required=False,
    )
    managed_floors = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Floor.objects.all(),
        required=False,
    )
    managed_departments = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Department.objects.all(),
        required=False,
    )

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "managed_buildings",
            "managed_floors",
            "managed_departments",
            "groups",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["is_active", "groups", "created_at", "updated_at"]


class RegisterSerializer(DefaultRegisterSerializer):
    username = None
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    password1 = serializers.CharField(write_only=True, min_length=8, required=True)
    password2 = serializers.CharField(write_only=True, min_length=8, required=True)

    class Meta:
        model = CustomUser
        fields = (
            "first_name",
            "last_name",
            "email",
            "password1",
            "password2",
        )

    def validate_email(self, email):
        if CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email already exists")
        return email

    def validate(self, attrs):
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError("Passwords do not match")
        return super().validate(attrs)

    def get_cleaned_data(self):
        return {
            "first_name": self.validated_data.get("first_name", ""),
            "last_name": self.validated_data.get("last_name", ""),
            "email": self.validated_data.get("email", ""),
            "password1": self.validated_data.get("password1", ""),
            "user_category": self.validated_data.get("user_category", ""),
        }

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            email=validated_data["email"],
            password=validated_data["password1"],
            user_category=validated_data["user_category"],
        )
        return user


class LoginSerializer(DefaultLoginSerializer):
    username = None
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if user and user.is_active:
            return {"user": user}
        raise serializers.ValidationError("Incorrect Credentials")

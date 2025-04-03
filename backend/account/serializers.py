# accounts/serializers.py
from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "password",
        )

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Incorrect Credentials")

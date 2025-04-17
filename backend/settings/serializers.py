from rest_framework import serializers

from .models import InstitutePolicy


class InstitutePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutePolicy
        fields = "__all__"
        read_only_fields = ["updated_at"]

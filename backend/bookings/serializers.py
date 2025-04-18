from datetime import timedelta
from venv import logger
import pytz
from django.utils.timezone import now
from rest_framework import serializers
from settings.models import InstitutePolicy
from django.db.models import Q
from django.contrib.auth import get_user_model
from rooms.models import Room
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all())
    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    approved_by_email = serializers.EmailField(
        source="approved_by.email",
        read_only=True,
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "room",
            "user",
            "user_email",
            "approved_by",
            "approved_by_email",
            "start_time",
            "end_time",
            "status",
            "purpose",
            "participants",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "approved_by",
            "status",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
    # Get or create policy
        policy = InstitutePolicy.objects.first()
        if not policy:
            policy = InstitutePolicy.objects.create()

        kolkata_tz = pytz.timezone("Asia/Kolkata")
        current_time = now().astimezone(kolkata_tz)

        # Ensure timezone-aware times
        try:
            booking_start = data["start_time"].astimezone(kolkata_tz)
            booking_end = data["end_time"].astimezone(kolkata_tz)
        except (AttributeError, ValueError, KeyError) as e:
            raise serializers.ValidationError({
                "time": "Invalid datetime format or missing timezone."
            })

        # Validate time ordering
        if booking_start >= booking_end:
            raise serializers.ValidationError({
                "time": "End time must be after start time."
            })

        # Working hours validation
        if policy.working_hours_start and policy.working_hours_end:
            try:
                policy_start = booking_start.replace(
                    hour=policy.working_hours_start.hour,
                    minute=policy.working_hours_start.minute,
                    second=0,
                    microsecond=0
                )
                policy_end = booking_start.replace(
                    hour=policy.working_hours_end.hour,
                    minute=policy.working_hours_end.minute,
                    second=0,
                    microsecond=0
                )

                # Only check working hours if booking is within allowed date range
                if booking_start.date() == current_time.date():
                    if booking_start < policy_start or booking_end > policy_end:
                        raise serializers.ValidationError({
                            "time": f"Bookings must be between {policy.working_hours_start.strftime('%H:%M')} "
                                f"and {policy.working_hours_end.strftime('%H:%M')}"
                        })
            except Exception as e:
                logger.exception("Working hours validation error")
                raise serializers.ValidationError({
                    "time": "Error validating working hours."
                })


        # Duration validation
        max_duration = policy.max_booking_duration_hours or 4
        duration = (booking_end - booking_start).total_seconds() / 3600
        if duration > max_duration:
            raise serializers.ValidationError({
                "duration": f"Booking duration cannot exceed {max_duration} hours"
            })

        # Advance booking
        booking_window = policy.booking_opening_days or 30
        max_future_date = current_time + timedelta(days=booking_window)
        if booking_start > max_future_date:
            raise serializers.ValidationError({
                "start_time": f"Cannot book more than {booking_window} days in advance"
            })

        # Backdated booking
        if not policy.allow_backdated_bookings and booking_start < current_time:
            raise serializers.ValidationError({
                "start_time": "Backdated bookings are not allowed"
            })

        # Minimum gap validation
        min_gap = policy.min_gap_between_bookings_minutes or 15
        min_gap_delta = timedelta(minutes=min_gap)
        room = data["room"]

        adjacent_bookings = Booking.objects.filter(
            room=room,
            status=Booking.APPROVED,
        ).filter(
            Q(end_time__range=(
                booking_start - min_gap_delta,
                booking_start + min_gap_delta
            )) |
            Q(start_time__range=(
                booking_end - min_gap_delta,
                booking_end + min_gap_delta
            ))
        )

        if self.instance:
            adjacent_bookings = adjacent_bookings.exclude(id=self.instance.id)

        if adjacent_bookings.exists():
            raise serializers.ValidationError({
                "time": f"Must maintain a gap of at least {min_gap} minutes between bookings"
            })

        # Overlap validation
        approved_conflicts = Booking.objects.filter(
            room=room,
            status=Booking.APPROVED,
            start_time__lt=data["end_time"],
            end_time__gt=data["start_time"]
        )

        if self.instance:
            approved_conflicts = approved_conflicts.exclude(id=self.instance.id)

        if approved_conflicts.exists():
            raise serializers.ValidationError({
                "room": "This room is already booked during this time."
            })

        # Duplicate pending booking by same user
        request = self.context.get("request")
        user = request.user if request else None

        if user:
            pending_conflicts = Booking.objects.filter(
                room=room,
                user=user,
                status=Booking.PENDING,
                start_time__lt=data["end_time"],
                end_time__gt=data["start_time"]
            )
            if self.instance:
                pending_conflicts = pending_conflicts.exclude(id=self.instance.id)
            if pending_conflicts.exists():
                raise serializers.ValidationError({
                    "room": "You already have a pending booking request during this time."
                })

        return data


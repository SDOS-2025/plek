# backend/accounts/permissions.py
import logging

from rest_framework import permissions

from accounts.models import CustomUser

logger = logging.getLogger(__name__)


class CanViewOwnBooking(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.view_own_booking"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user or request.user.has_perm("bookings.view_all_bookings")


class CanCreateBooking(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.create_booking"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanModifyOwnBooking(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.modify_own_booking"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user or request.user.has_perm("bookings.override_booking")


class CanCancelOwnBooking(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.cancel_own_booking"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user or request.user.has_perm("bookings.override_booking")


class CanViewFloorDeptBookings(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.view_floor_dept_bookings"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        try:
            return request.user.can_manage_room(obj.room) or request.user.has_perm(
                "bookings.view_all_bookings"
            )
        except AttributeError:
            return False


class CanApproveOrRejectBooking(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and (
                request.user.has_perm("bookings.approve_booking")
                or request.user.has_perm("bookings.reject_booking")
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        try:
            return request.user.can_manage_room(obj.room) or request.user.has_perm(
                "bookings.override_booking"
            )
        except AttributeError:
            return False


class CanOverrideBooking(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.override_booking"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanViewAllBookings(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "bookings.view_all_bookings"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanViewRooms(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            # Allow any authenticated user to view rooms
            return request.user.is_authenticated
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanManageRooms(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm("rooms.manage_rooms")
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanManageBuildings(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "buildings.manage_buildings"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanManageAmenities(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "amenities.manage_amenities"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanManageInstitutePolicies(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm(
                "institute_policies.manage_institute_policies"
            )
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanViewUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm("users.view_all_users")
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False


class CanModerateUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            return request.user.is_authenticated and request.user.has_perm("users.moderate_user")
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        return obj != request.user  # Prevent self-moderation


class CanPromoteOrDemote(permissions.BasePermission):
    def has_permission(self, request, view):
        try:
            target_role = request.data.get("group")
            action = request.data.get("action")  # 'promote' or 'demote'
            if not target_role or not action:
                return False
            role_to_perm = {
                "User": f"users.{action}_to_user",
                "Coordinator": f"users.{action}_to_coordinator",
                "Admin": f"users.{action}_to_admin",
                "SuperAdmin": (f"users.{action}_to_super_admin" if action == "promote" else None),
            }
            required_perm = role_to_perm.get(target_role)
            if not required_perm:
                return False
            return request.user.is_authenticated and request.user.has_perm(required_perm)
        except Exception as e:
            logger.error(f"Permission check failed for user {request.user.email}: {str(e)}")
            return False

    def has_object_permission(self, request, view, obj):
        if request.data.get("action") == "demote" and obj.groups.filter(name="SuperAdmin").exists():
            superadmin_count = CustomUser.objects.filter(
                groups__name="SuperAdmin", is_active=True
            ).count()
            if superadmin_count <= 1:
                return False
        return obj != request.user

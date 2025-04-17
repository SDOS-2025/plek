from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import migrations


def create_groups_and_permissions(apps, schema_editor):
    User = apps.get_model("accounts", "CustomUser")
    Booking = apps.get_model("bookings", "Booking")
    Room = apps.get_model("rooms", "Room")
    Building = apps.get_model("rooms", "Building")
    Amenity = apps.get_model("rooms", "Amenity")
    InstitutePolicy = apps.get_model("settings", "InstitutePolicy")

    group_names = ["User", "Coordinator", "Admin", "SuperAdmin"]
    groups = {}
    for group_name in group_names:
        group, _ = Group.objects.get_or_create(name=group_name)
        groups[group_name] = group

    booking_content_type = ContentType.objects.get_for_model(Booking)
    booking_permissions = [
        ("view_own_booking", "Can view own bookings"),
        ("create_booking", "Can create bookings"),
        ("modify_own_booking", "Can modify own bookings"),
        ("cancel_own_booking", "Can cancel own bookings"),
        ("view_all_bookings", "Can view all bookings"),
        ("view_floor_dept_bookings", "Can view bookings for floor or department"),
        ("approve_booking", "Can approve bookings"),
        ("reject_booking", "Can reject bookings"),
        ("override_booking", "Can override bookings"),
    ]
    booking_perm_objects = []
    for codename, name in booking_permissions:
        permission, created = Permission.objects.get_or_create(
            codename=codename,
            content_type=booking_content_type,
            defaults={"name": name},
        )
        booking_perm_objects.append(permission)

    room_content_type = ContentType.objects.get_for_model(Room)
    room_permissions = [
        ("view_rooms", "Can view all rooms"),
        ("manage_rooms", "Can manage rooms (add/modify/delete)"),
    ]
    room_perm_objects = []
    for codename, name in room_permissions:
        permission, created = Permission.objects.get_or_create(
            codename=codename, content_type=room_content_type, defaults={"name": name}
        )
        room_perm_objects.append(permission)

    building_content_type = ContentType.objects.get_for_model(Building)
    building_permissions = [
        ("manage_buildings", "Can manage buildings (add/delete)"),
    ]
    building_perm_objects = []
    for codename, name in building_permissions:
        permission, created = Permission.objects.get_or_create(
            codename=codename,
            content_type=building_content_type,
            defaults={"name": name},
        )
        building_perm_objects.append(permission)

    amenity_content_type = ContentType.objects.get_for_model(Amenity)
    amenity_permissions = [
        ("manage_amenities", "Can manage amenities (add/delete)"),
    ]
    amenity_perm_objects = []
    for codename, name in amenity_permissions:
        permission, created = Permission.objects.get_or_create(
            codename=codename,
            content_type=amenity_content_type,
            defaults={"name": name},
        )
        amenity_perm_objects.append(permission)

    institute_policy_content_type = ContentType.objects.get_for_model(InstitutePolicy)
    institute_policy_permissions = [
        ("manage_institute_policies", "Can manage institute policies"),
    ]
    institute_policy_perm_objects = []
    for codename, name in institute_policy_permissions:
        permission, created = Permission.objects.get_or_create(
            codename=codename,
            content_type=institute_policy_content_type,
            defaults={"name": name},
        )
        institute_policy_perm_objects.append(permission)

    user_content_type = ContentType.objects.get_for_model(User)
    user_permissions = [
        ("view_all_users", "Can view all users"),
        ("moderate_user", "Can moderate users"),
        ("promote_to_coordinator", "Can promote to Coordinator"),
        ("promote_to_admin", "Can promote to Admin"),
        ("promote_to_super_admin", "Can promote to SuperAdmin"),
        ("demote_to_user", "Can demote to User"),
        ("demote_to_coordinator", "Can demote to Coordinator"),
        ("demote_to_admin", "Can demote to Admin"),
    ]
    user_perm_objects = []
    for codename, name in user_permissions:
        permission, created = Permission.objects.get_or_create(
            codename=codename, content_type=user_content_type, defaults={"name": name}
        )
        user_perm_objects.append(permission)

    # Assign permissions to groups (cumulative for hierarchy)
    permissions_by_group = {
        "User": [
            ("rooms", "view_rooms"),
            ("bookings", "view_own_booking"),
            ("bookings", "create_booking"),
            ("bookings", "modify_own_booking"),
            ("bookings", "cancel_own_booking"),
        ],
        "Coordinator": [
            ("rooms", "view_rooms"),
            ("bookings", "view_own_booking"),
            ("bookings", "create_booking"),
            ("bookings", "modify_own_booking"),
            ("bookings", "cancel_own_booking"),
            ("bookings", "view_floor_dept_bookings"),
            ("bookings", "approve_booking"),
            ("bookings", "reject_booking"),
        ],
        "Admin": [
            ("rooms", "view_rooms"),
            ("rooms", "manage_rooms"),
            ("bookings", "view_own_booking"),
            ("bookings", "create_booking"),
            ("bookings", "modify_own_booking"),
            ("bookings", "cancel_own_booking"),
            ("bookings", "view_floor_dept_bookings"),
            ("bookings", "view_all_bookings"),
            ("bookings", "approve_booking"),
            ("bookings", "reject_booking"),
            ("bookings", "override_booking"),
            ("buildings", "manage_buildings"),
            ("amenities", "manage_amenities"),
            ("users", "view_all_users"),
            ("users", "promote_to_coordinator"),
            ("users", "demote_to_user"),
        ],
        "SuperAdmin": [
            ("rooms", "view_rooms"),
            ("rooms", "manage_rooms"),
            ("bookings", "view_own_booking"),
            ("bookings", "create_booking"),
            ("bookings", "modify_own_booking"),
            ("bookings", "cancel_own_booking"),
            ("bookings", "view_floor_dept_bookings"),
            ("bookings", "view_all_bookings"),
            ("bookings", "approve_booking"),
            ("bookings", "reject_booking"),
            ("bookings", "override_booking"),
            ("buildings", "manage_buildings"),
            ("amenities", "manage_amenities"),
            ("users", "view_all_users"),
            ("users", "moderate_user"),
            ("institute_policies", "manage_institute_policies"),
            ("users", "promote_to_coordinator"),
            ("users", "promote_to_admin"),
            ("users", "promote_to_super_admin"),
            ("users", "demote_to_user"),
            ("users", "demote_to_coordinator"),
            ("users", "demote_to_admin"),
        ],
    }

    # Map model names to content types
    content_type_map = {
        "rooms": ContentType.objects.get_for_model(Room),
        "bookings": ContentType.objects.get_for_model(Booking),
        "buildings": ContentType.objects.get_for_model(Building),
        "amenities": ContentType.objects.get_for_model(Amenity),
        "users": ContentType.objects.get_for_model(User),
        "institute_policies": ContentType.objects.get_for_model(InstitutePolicy),
    }

    # Assign permissions to groups
    for group_name, permissions in permissions_by_group.items():
        group = groups[group_name]
        for app_label, codename in permissions:
            try:
                permission = Permission.objects.get(
                    content_type=content_type_map[app_label], codename=codename
                )
                group.permissions.add(permission)
            except Permission.DoesNotExist:
                print(f"Permission {codename} for {app_label} does not exist")


def reverse_func(apps, schema_editor):
    # Delete created groups
    Group = apps.get_model("auth", "Group")
    for group_name in ["User", "Coordinator", "Admin", "SuperAdmin"]:
        try:
            group = Group.objects.get(name=group_name)
            group.delete()
        except Group.DoesNotExist:
            pass

    # Delete custom permissions
    Permission = apps.get_model("auth", "Permission")
    custom_permissions = [
        # Booking permissions
        "view_own_booking",
        "create_booking",
        "modify_own_booking",
        "cancel_own_booking",
        "view_all_bookings",
        "view_floor_dept_bookings",
        "approve_booking",
        "reject_booking",
        "override_booking",
        # Room permissions
        "view_rooms",
        "manage_rooms",
        # Building permissions
        "manage_buildings",
        # Amenity permissions
        "manage_amenities",
        # Institute policy permissions
        "manage_institute_policies",
        # User permissions
        "view_all_users",
        "moderate_user",
        "promote_to_coordinator",
        "promote_to_admin",
        "promote_to_super_admin",
        "demote_to_user",
        "demote_to_coordinator",
        "demote_to_admin",
    ]

    Permission.objects.filter(codename__in=custom_permissions).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("bookings", "0001_initial"),
        ("rooms", "0001_initial"),
        ("settings", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_groups_and_permissions, reverse_func),
    ]

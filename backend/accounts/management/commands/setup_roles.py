# account/management/commands/setup_roles.py
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Sets up initial groups and permissions"

    def handle(self, *args, **kwargs):
        # Create groups
        student_group, _ = Group.objects.get_or_create(name="Student")
        coordinator_group, _ = Group.objects.get_or_create(name="Coordinator")
        admin_group, _ = Group.objects.get_or_create(name="Admin")

        # Define permissions
        student_permissions = ["view_room", "view_booking", "add_booking"]
        coordinator_permissions = [
            "view_room",
            "view_booking",
            "add_booking",
            "change_booking",
            "delete_booking",
        ]
        admin_permissions = [
            "view_room",
            "add_room",
            "change_room",
            "delete_room",
            "view_booking",
            "add_booking",
            "change_booking",
            "delete_booking",
        ]

        # Assign permissions
        for perm in student_permissions:
            try:
                permission = Permission.objects.get(codename=perm)
                student_group.permissions.add(permission)
                self.stdout.write(self.style.SUCCESS(f"Added {perm} to Student"))
            except Permission.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"Permission {perm} does not exist")
                )

        for perm in coordinator_permissions:
            try:
                permission = Permission.objects.get(codename=perm)
                coordinator_group.permissions.add(permission)
                self.stdout.write(self.style.SUCCESS(f"Added {perm} to Coordinator"))
            except Permission.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"Permission {perm} does not exist")
                )

        for perm in admin_permissions:
            try:
                permission = Permission.objects.get(codename=perm)
                admin_group.permissions.add(permission)
                self.stdout.write(self.style.SUCCESS(f"Added {perm} to Admin"))
            except Permission.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"Permission {perm} does not exist")
                )

        self.stdout.write(self.style.SUCCESS("Roles and permissions setup complete"))

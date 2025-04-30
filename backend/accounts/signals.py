# accounts/signals.py
import logging

from django.contrib.auth.models import Group
from django.db.models.signals import m2m_changed, post_save, pre_save
from django.dispatch import receiver
from allauth.socialaccount.models import SocialAccount

from .models import CustomUser

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CustomUser)
def assign_default_group(sender, instance, created, **kwargs):
    """
    Assign newly created users to the 'User' group automatically,
    unless they are superusers (who should be in the 'SuperAdmin' group).
    """
    if created and not instance.is_superuser:
        try:
            user_group = Group.objects.get(name="User")
            instance.groups.add(user_group)
            logger.info(f"User {instance.email} automatically assigned to 'User' group")
        except Group.DoesNotExist:
            logger.warning("Default 'User' group does not exist!")
    # Avoid recursive saving by using update() on querysets instead of save()
    elif not instance.groups.filter(name="Coordinator").exists():
        instance.managed_floors.clear()
        instance.managed_departments.clear()
        # Removed the instance.save() call that was causing recursion


@receiver(m2m_changed, sender=CustomUser.groups.through)
def log_group_changes(sender, instance, action, pk_set, **kwargs):
    """
    Log when a user's group membership changes
    """
    if action == "post_add" and pk_set:
        group_names = Group.objects.filter(pk__in=pk_set).values_list("name", flat=True)
        logger.info(f"User {instance.email} added to groups: {', '.join(group_names)}")
    elif action == "post_remove" and pk_set:
        group_names = Group.objects.filter(pk__in=pk_set).values_list("name", flat=True)
        logger.info(
            f"User {instance.email} removed from groups: {', '.join(group_names)}"
        )


@receiver(pre_save, sender=CustomUser)
def log_status_changes(sender, instance, **kwargs):
    """
    Log when a user's active status changes
    """
    if instance.pk:  # Only for existing users
        try:
            old_instance = CustomUser.objects.get(pk=instance.pk)
            if old_instance.is_active != instance.is_active:
                action = "activated" if instance.is_active else "deactivated"
                logger.info(f"User {instance.email} {action}")
        except CustomUser.DoesNotExist:
            pass


@receiver(m2m_changed, sender=CustomUser.managed_floors.through)
def log_floor_management_changes(sender, instance, action, pk_set, **kwargs):
    """
    Log when a user's floor management responsibilities change
    """
    if action == "post_add" and pk_set:
        floor_ids = list(pk_set)
        logger.info(f"User {instance.email} assigned to manage floor IDs: {floor_ids}")
    elif action == "post_remove" and pk_set:
        floor_ids = list(pk_set)
        logger.info(
            f"User {instance.email} removed from managing floor IDs: {floor_ids}"
        )


@receiver(m2m_changed, sender=CustomUser.managed_departments.through)
def log_department_management_changes(sender, instance, action, pk_set, **kwargs):
    """
    Log when a user's department management responsibilities change
    """
    if action == "post_add" and pk_set:
        department_ids = list(pk_set)
        logger.info(
            f"User {instance.email} assigned to manage department IDs: {department_ids}"
        )
    elif action == "post_remove" and pk_set:
        department_ids = list(pk_set)
        logger.info(
            f"User {instance.email} removed from managing department IDs: {department_ids}"
        )

from django.dispatch import receiver
from django.db.models.signals import pre_save, post_save

from .models import Notification
from tasks.models import Task


@receiver(post_save, sender=Task)
def create_priority_notification(sender, instance, created, **kwargs):
    old_priority = getattr(instance, "_priority_old", None)
    if old_priority:
        Notification.objects.create(
            user=instance.assigned_to,
            task=instance,
            message=f"Priority escalated from {old_priority} to {instance.priority}"
        )

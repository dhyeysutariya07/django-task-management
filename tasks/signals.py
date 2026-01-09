from datetime import timedelta
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Task, TaskHistory, User

def next_priority(current):
    levels = [Task.Priority.LOW, Task.Priority.MEDIUM, Task.Priority.HIGH, Task.Priority.CRITICAL]
    try:
        index = levels.index(current)
        return levels[min(index + 1, len(levels) - 1)]
    except ValueError:
        return current

# -----------------------------
# Cascading Status Updates
# -----------------------------
@receiver(pre_save, sender=Task)
def handle_cascading_status(sender, instance, **kwargs):
    if not instance.pk:
        return  # skip on creation

    previous = Task.objects.get(pk=instance.pk)
    user = getattr(instance, "_changed_by", None)  # optional: set from serializer context

    # 1️⃣ Parent completed → child tasks
    if previous.status != Task.Status.COMPLETED and instance.status == Task.Status.COMPLETED:
        for child in instance.children.all():
            if child.status == Task.Status.PENDING:
                old_status = child.status
                child.status = Task.Status.COMPLETED
                child.save()
                TaskHistory.objects.create(
                    task=child,
                    changed_by=user,
                    previous_status=old_status,
                    new_status=Task.Status.COMPLETED,
                    notes=f"Cascaded from parent task {instance.id}"
                )
            elif child.status in [Task.Status.IN_PROGRESS, Task.Status.BLOCKED]:
                raise ValueError(
                    f"Cannot complete parent task because child task {child.id} is {child.status}"
                )

    # 2️⃣ Child blocked → parent blocked
    if previous.status != Task.Status.BLOCKED and instance.status == Task.Status.BLOCKED:
        if instance.parent_task and instance.parent_task.status != Task.Status.BLOCKED:
            parent = instance.parent_task
            old_status = parent.status
            parent.status = Task.Status.BLOCKED
            parent.save()
            TaskHistory.objects.create(
                task=parent,
                changed_by=user,
                previous_status=old_status,
                new_status=Task.Status.BLOCKED,
                notes=f"Parent blocked because child task {instance.id} is blocked"
            )

# -----------------------------
# Dynamic Priority Escalation
# -----------------------------
@receiver(pre_save, sender=Task)
def auto_escalate_priority(sender, instance, **kwargs):
    if instance.status == Task.Status.COMPLETED:
        return

    if instance.deadline and not instance.priority_escalated:
        now = timezone.now()
        if instance.deadline <= now + timedelta(hours=24):
            old_priority = instance.priority
            instance.priority = next_priority(instance.priority)
            instance.priority_escalated = True

            # Optional: create notification in post_save
            instance._priority_old = old_priority

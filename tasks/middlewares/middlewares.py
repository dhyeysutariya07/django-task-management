
from datetime import timedelta
import time
from django.utils import timezone
from django.core.cache import cache
from notifications.models import Notification
from tasks.models import Task
from tasks.rate_limits import RATE_LIMITS, WINDOW_SECONDS

PRIORITY_ORDER = ["low", "medium", "high", "critical"]

class PriorityEscalationMiddleware:
    """
    Escalates task priority if the deadline is within 24h and task is not completed.
    Only escalates once per task using `priority_escalated` flag.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        now = timezone.now()
        # Only escalate tasks that are not completed and not escalated yet
        tasks_to_escalate = Task.objects.filter(
            status__in=["pending", "in_progress", "blocked"],
            priority_escalated=False,
            deadline__lte=now + timedelta(hours=24),
            deadline__gte=now
        )

        for task in tasks_to_escalate:
            # Increase priority by one level
            try:
                idx = PRIORITY_ORDER.index(task.priority)
                if idx < len(PRIORITY_ORDER) - 1:
                    old_priority = task.priority
                    task.priority = PRIORITY_ORDER[idx + 1]
                    task.priority_escalated = True
                    task.save()

                    # Create notification
                    Notification.objects.create(
                        user=task.assigned_to,
                        task=task,
                        message=f"Priority of task '{task.title}' escalated from {old_priority} to {task.priority} due to upcoming deadline."
                    )
            except ValueError:
                # skip if priority is invalid
                continue

        response = self.get_response(request)
        return response


class SuccessfulRequestCountingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return response

        if response.status_code >= 400:
            return response  

        method_type = "read" if request.method in ("GET", "HEAD", "OPTIONS") else "write"
        role = user.role
        limit = RATE_LIMITS.get(role, {}).get(method_type)

        if limit in (None, 0):
            return response

        key = f"rate:{user.id}:{method_type}"
        record = cache.get(key)

        if not record:
            record = {"count": 1, "start": time.time()}
        else:
            record["count"] += 1

        cache.set(key, record, WINDOW_SECONDS)

        return response
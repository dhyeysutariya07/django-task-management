from rest_framework.permissions import BasePermission
    
import pytz
from datetime import time
from django.utils import timezone
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == "manager"


class IsDeveloper(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == "developer"


class IsAuditor(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == "auditor"


class TemporalTaskUpdatePermission(BasePermission):
    """
    Developers:
      - Can READ anytime
      - Can UPDATE only between 9AM–6PM (their timezone)
      - Can UPDATE anytime if task is CRITICAL

    Managers:
      - No restrictions
    """

    message = "You can update tasks only between 9 AM and 6 PM in your timezone."

    def has_object_permission(self, request, view, obj):
        user = request.user

        # READ is always allowed
        if request.method in SAFE_METHODS:
            return True

        # Managers have no restriction
        if user.role == "manager":
            return True

        # Only developers are restricted
        if user.role != "developer":
            return False

        # Critical tasks can be updated anytime
        if obj.priority == "critical":
            return True

        # Get user's timezone
        user_tz = pytz.timezone(user.timezone or 'UTC')

        now_local = timezone.now().astimezone(user_tz).time()

        start_time = time(9, 0)   # 9 AM
        end_time = time(18, 0)    # 6 PM

        return start_time <= now_local <= end_time


class AuditorWriteForbidden(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if user.role == "auditor" and request.method not in SAFE_METHODS:
            return False

        return True
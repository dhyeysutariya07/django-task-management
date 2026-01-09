from rest_framework.throttling import UserRateThrottle
import time
from django.core.cache import cache
from rest_framework.throttling import BaseThrottle
from rest_framework.exceptions import Throttled


from tasks.rate_limits import RATE_LIMITS, WINDOW_SECONDS

class AuditorReadBypassThrottle(UserRateThrottle):
    """
    Throttle class that bypasses rate limiting for Auditors on GET requests.
    All other users follow normal rate limits.
    """

    scope = "task_read"

    def allow_request(self, request, view):
        user = getattr(request, "user", None)
        
        # Auditors bypass throttle for GET requests
        if user and user.is_authenticated and user.role == "auditor" and request.method == "GET":
            return True

        # Fallback to normal throttling
        return super().allow_request(request, view)

class RoleBasedThrottle(BaseThrottle):
    def allow_request(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return True

        method_type = "read" if request.method in ("GET", "HEAD", "OPTIONS") else "write"
        role = user.role

        limit = RATE_LIMITS.get(role, {}).get(method_type)

        # Unlimited
        if limit is None:
            return True

        if limit == 0:
            raise Throttled(detail="WRITE operations are not allowed.")

        cache_key = self._key(user, method_type)
        record = cache.get(cache_key, {"count": 0, "start": time.time()})

        elapsed = time.time() - record["start"]
        if elapsed > WINDOW_SECONDS:
            cache.delete(cache_key)
            return True

        if record["count"] >= limit:
            remaining = int(WINDOW_SECONDS - elapsed)

            if method_type == "write":
                raise Throttled(
                    detail="Write rate limit exceeded.",
                    wait=remaining
                )

            raise Throttled(detail="Rate limit exceeded.")

        return True

    def _key(self, user, method_type):
        return f"rate:{user.id}:{method_type}"
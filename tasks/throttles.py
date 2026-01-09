from rest_framework.throttling import UserRateThrottle
import time
from django.core.cache import cache
from rest_framework.throttling import BaseThrottle
from rest_framework.exceptions import Throttled


from tasks.rate_limits import RATE_LIMITS, WINDOW_SECONDS


class RoleBasedThrottle(BaseThrottle):
    
    def allow_request(self, request, view):
        print("THROTTLE HIT:", request.method, request.path)

        # Ignore preflight
        if request.method == "OPTIONS":
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return True

        method_type = "read" if request.method == "GET" else "write"
        role = user.role

        limit = RATE_LIMITS.get(role, {}).get(method_type)

        # Unlimited (Auditor read)
        if limit is None:
            return True

        # Hard block (Auditor write)
        if limit == 0:
            raise Throttled(detail="WRITE operations are not allowed.")

        cache_key = f"rate:{user.id}:{method_type}"
        record = cache.get(cache_key)
        now = time.time()

        if not record:
            cache.set(
                cache_key,
                {"count": 1, "start": now},
                timeout=WINDOW_SECONDS
            )
            return True

        elapsed = now - record["start"]

        if elapsed > WINDOW_SECONDS:
            cache.set(
                cache_key,
                {"count": 1, "start": now},
                timeout=WINDOW_SECONDS
            )
            return True

        if record["count"] >= limit:
            raise Throttled(detail="Rate limit exceeded.")

        record["count"] += 1
        cache.set(cache_key, record, timeout=WINDOW_SECONDS)
        return True

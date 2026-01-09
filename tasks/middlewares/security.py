from django.http import JsonResponse
from django.utils import timezone
from django.core.cache import cache

class SmartSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            return self.get_response(request)

        ip = self.get_client_ip(request)

        if request.path.startswith("/api/tasks/analytics/"):
            return self.get_response(request)

        # Example: blocked IP logic
        blocked_key = f"blocked:{ip}"
        blocked_until = cache.get(blocked_key)

        if blocked_until and timezone.now() < blocked_until:
            # CAPTCHA requirement
            captcha_answer = request.headers.get("X-Captcha-Answer")
            expected = cache.get(f"captcha:{ip}")

            if not captcha_answer or captcha_answer != str(expected):
                return JsonResponse(
                    {
                        "detail": "IP blocked",
                        "captcha_question": "What is 3 + 4?"
                    },
                    status=403
                )

            # CAPTCHA solved → unblock
            cache.delete(blocked_key)
            cache.delete(f"captcha:{ip}")

        return self.get_response(request)

    def get_client_ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        return xff.split(",")[0] if xff else request.META.get("REMOTE_ADDR")
